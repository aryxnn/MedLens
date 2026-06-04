import os
import json
import re
import requests
import pickle
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from chromadb import PersistentClient
from pydantic import BaseModel
from tenacity import retry, wait_exponential
from sentence_transformers import CrossEncoder

load_dotenv(override=True)

# LLM for HyDE generation and synthesis
MODEL = "llama3.2"
EMBED_MODEL = "mxbai-embed-large"
OLLAMA_HOST = "http://localhost:11434"

DB_NAME = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent / "preprocessed_db"))
collection_name = "docs"
wait = wait_exponential(multiplier=1, min=10, max=240)

BM25_INDEX_PATH = Path(__file__).parent / "bm25_index.pkl"
CENTROIDS_PATH = Path(__file__).parent / "centroids.json"
CATEGORY_THRESHOLD = 0.55
USE_BM25 = os.getenv("USE_BM25", "true").lower() == "true"

chroma = PersistentClient(path=DB_NAME)
collection = chroma.get_or_create_collection(collection_name)



RETRIEVAL_K = 50   # Stage 1: candidates size
RERANK_K = 10      # Stage 2: cross-encoder outputs
FINAL_K = 5        # Stage 3: final LLM context size

# Load centroids at startup
centroids = {}
if CENTROIDS_PATH.exists():
    try:
        with open(CENTROIDS_PATH, "r") as f:
            centroids = json.load(f)
    except Exception as e:
        print(f"Error loading centroids: {e}")

# Load BM25 index at startup
bm25 = None
if USE_BM25 and BM25_INDEX_PATH.exists():
    try:
        with open(BM25_INDEX_PATH, "rb") as f:
            bm25 = pickle.load(f)
    except Exception as e:
        print(f"Error loading BM25 index: {e}")

# Load all documents & metadata from ChromaDB for BM25 mapping
all_docs = []
all_metas = []
if USE_BM25:
    try:
        all_data = collection.get()
        # Stable sort by ID to ensure order matches exactly with the index built during ingestion
        zipped = list(zip(all_data["ids"], all_data["documents"], all_data["metadatas"]))
        zipped.sort(key=lambda x: x[0])
        
        all_docs = [x[1] for x in zipped]
        all_metas = [x[2] for x in zipped]
    except Exception as e:
        print(f"Error caching documents: {e}")


# Load cross-encoder at module level (fast, lightweight, runs locally)
try:
    reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
except Exception as e:
    print(f"Warning: Failed to load cross-encoder: {e}. Falling back to default retrieval.")
    reranker = None

SYSTEM_PROMPT = """
You are a knowledgeable, friendly medical triage assistant representing MedLens.
Your answer will be evaluated for accuracy, relevance and completeness.
If you don't know the answer, say so.
For context, here are specific extracts from the Clinical Knowledge Base that might be directly relevant to the user's symptoms:
{context}

With this context, please answer the user's question, providing possible conditions, self-care treatments, and recommended medications.
"""

class Result(BaseModel):
    page_content: str
    metadata: dict

def cosine_similarity(v1, v2):
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))

def detect_category_by_embedding(query_vector, centroids, threshold=0.55):
    best_cat, best_score = None, -1.0
    for cat, centroid in centroids.items():
        score = cosine_similarity(query_vector, centroid)
        if score > best_score:
            best_score = score
            best_cat = cat
    print(f"[CATEGORY DETECTION] Best match: {best_cat} (score: {best_score:.4f})")
    return best_cat if best_score >= threshold else None

def get_ollama_query_embedding(text: str):
    res = requests.post(f"{OLLAMA_HOST}/api/embeddings", json={
        "model": EMBED_MODEL,
        "prompt": text
    })
    if res.status_code == 200:
        return res.json()["embedding"]
    else:
        raise Exception(f"Ollama embedding query failure: {res.text}")

def generate_hyde_doc(question):
    """Generates a hypothetical clinical description of the symptoms using llama3.2"""
    hyde_prompt = f"""
You are an NHS medical writer. Write a 3-sentence clinical description in NHS style for a condition with these symptoms:
{question}

Format exactly like this:
"[Condition name] is a condition that causes [main symptoms]. Common signs include [specific symptoms]. 
Patients may also experience [related symptoms]."

Output only the description. No headings, no advice, no disclaimers.
"""
    try:
        res = requests.post(f"{OLLAMA_HOST}/api/chat", json={
            "model": MODEL,
            "messages": [{"role": "user", "content": hyde_prompt}],
            "stream": False
        }, timeout=8)
        if res.status_code == 200:
            content = res.json()["message"]["content"].strip()
            if content:
                return content
    except Exception as e:
        print(f"HyDE generation timeout or error: {e}. Using template fallback.")
        
    # Robust template fallback
    return f"""
NHS Condition Overview: A condition characterised by {question}.
Common symptoms include these details. Patients typically present with these symptoms and may also experience related complications.
"""

def keyword_match_score(query_text, distinguishing_keywords):
    if not distinguishing_keywords:
        return 0.0
    if isinstance(distinguishing_keywords, str):
        kw_list = [k.strip() for k in distinguishing_keywords.split(",") if k.strip()]
    else:
        kw_list = distinguishing_keywords
        
    query_lower = query_text.lower()
    matches = 0
    for kw in kw_list:
        kw_lower = kw.lower()
        if kw_lower in query_lower:
            matches += 1
        else:
            kw_words = set(re.findall(r'\w+', kw_lower)) - {"of", "in", "and", "or", "with", "the"}
            q_words = set(re.findall(r'\w+', query_lower))
            if kw_words and kw_words.intersection(q_words):
                # partial match
                matches += 0.5
                
    return matches / len(kw_list) if kw_list else 0.0




def is_hyde_specific(hyde_doc, min_medical_terms=3):
    """Check if HyDE generated something clinically specific enough"""
    medical_indicators = [
        "condition", "symptoms include", "patients", "presents with",
        "characterised by", "diagnosis", "treatment"
    ]
    specific_terms = sum(1 for term in medical_indicators if term in hyde_doc.lower())
    return specific_terms >= min_medical_terms


def fetch_context(original_question, threshold=CATEGORY_THRESHOLD):
    try:
        # 1. Generate hypothetical document using HyDE
        hyde_doc = generate_hyde_doc(original_question)
        
        # 2. Embed both HyDE doc and original question
        hyde_vector = get_ollama_query_embedding(hyde_doc)
        orig_vector = get_ollama_query_embedding(original_question)
        
        # Check if HyDE output is clinically specific
        is_specific = is_hyde_specific(hyde_doc)
        if not is_specific:
            print("[HyDE] Generic output detected — using original question vector for Stage 1")
        
        # 3. Detect category via embedding centroid
        category = detect_category_by_embedding(hyde_vector if is_specific else orig_vector, centroids, threshold=threshold)

        where_filter = {"category": category} if category else None
        
        # 4. Stage 1: Vector retrieval
        search_vector = hyde_vector if is_specific else orig_vector
        hyde_results = collection.query(
            query_embeddings=[search_vector],
            n_results=30,
            where=where_filter
        )
        # Use unfiltered original vector search as a safety net
        orig_results = collection.query(
            query_embeddings=[orig_vector],
            n_results=15
        )
        
        # 5. Stage 1: BM25 retrieval
        bm25_candidates = []
        if USE_BM25 and bm25 and len(all_docs) > 0:

            tokenized_query = original_question.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            scored_indices = []
            for idx, score in enumerate(bm25_scores):
                scored_indices.append((score, idx))
            scored_indices.sort(key=lambda x: x[0], reverse=True)
            
            filtered_bm25 = []
            unfiltered_bm25 = []
            for score, idx in scored_indices[:25]:
                if category and all_metas[idx].get("category") != category:
                    unfiltered_bm25.append((all_docs[idx], all_metas[idx]))
                else:
                    filtered_bm25.append((all_docs[idx], all_metas[idx]))
            
            bm25_candidates = filtered_bm25
            if len(bm25_candidates) < 10:
                bm25_candidates += unfiltered_bm25[:10 - len(bm25_candidates)]

        # Merge and deduplicate exact content using a 100-character fingerprint
        all_docs_list = []
        seen_content = set()
        
        def add_candidate(doc, meta):
            content_key = doc[:100]
            if content_key not in seen_content:
                seen_content.add(content_key)
                all_docs_list.append(Result(page_content=doc, metadata=meta))
                
        # Add hyde vector results
        if hyde_results and "documents" in hyde_results and hyde_results["documents"][0]:
            for doc, meta in zip(hyde_results["documents"][0], hyde_results["metadatas"][0]):
                add_candidate(doc, meta)
                
        # Add original vector results
        if orig_results and "documents" in orig_results and orig_results["documents"][0]:
            for doc, meta in zip(orig_results["documents"][0], orig_results["metadatas"][0]):
                add_candidate(doc, meta)
                
        # Add BM25 results
        for doc, meta in bm25_candidates:
            add_candidate(doc, meta)
                        
        # 6. Limit to max 3 chunks per distinct source document
        source_count = {}
        deduplicated_candidates = []
        
        for c in all_docs_list:
            source = c.metadata.get("source")
            source_count[source] = source_count.get(source, 0) + 1
            if source_count[source] > 3:
                continue
            deduplicated_candidates.append(c)
                
        # 7. Stage 2: Rerank using the specialized Cross-Encoder model + Jaccard keywords boost
        candidates_to_score = deduplicated_candidates[:RETRIEVAL_K]
        if reranker and len(candidates_to_score) > 0:
            pairs = [(original_question, c.page_content) for c in candidates_to_score]
            cross_scores = reranker.predict(pairs)
            
            hybrid_scores = []
            for c, cross_score in zip(candidates_to_score, cross_scores):
                # Calculate keyword match score on distinguishing keywords
                dist_kw = c.metadata.get("distinguishing_keywords", "")
                match_score = keyword_match_score(original_question, dist_kw)
                
                # match_score runs 0.0 - 1.0, cross_score is logit. Scale by 3.0 to give it a significant boost.
                score = cross_score + 3.0 * match_score
                hybrid_scores.append((c, score))

            
            # Sort descending by hybrid score
            ranked_items = sorted(
                hybrid_scores, 
                key=lambda x: x[1], 
                reverse=True
            )
            
            # Consolidate to select only the top chunk per distinct source document for diagnostic diversity
            consolidated_chunks = []
            seen_sources = set()
            for item, score in ranked_items:
                source = item.metadata.get("source")
                if source not in seen_sources:
                    seen_sources.add(source)
                    consolidated_chunks.append(item)
            
            top_chunks = consolidated_chunks[:FINAL_K]
            return top_chunks
        else:
            # Also consolidate fallback
            consolidated_chunks = []
            seen_sources = set()
            for item in candidates_to_score:
                source = item.metadata.get("source")
                if source not in seen_sources:
                    seen_sources.add(source)
                    consolidated_chunks.append(item)
            return consolidated_chunks[:FINAL_K]
            
    except Exception as e:
        print(f"Error fetching context: {e}")
        return []

def make_rag_messages(question, history, chunks):
    context = "\n\n".join([f"--- Chunk {i+1} ---\n{c.page_content}" for i, c in enumerate(chunks)])
    system_msg = SYSTEM_PROMPT.format(context=context)
    
    messages = [{"role": "system", "content": system_msg}]
    for h in history:
        messages.append(h)
    messages.append({"role": "user", "content": question})
    return messages

@retry(wait=wait)
def answer_question(question: str, history: list[dict] = []) -> tuple[str, list]:
    chunks = fetch_context(question)
    messages = make_rag_messages(question, history, chunks)
    res = requests.post(f"{OLLAMA_HOST}/api/chat", json={
        "model": "phi3",  # phi3 remains the reasoning model for diagnostic output synthesis
        "messages": messages,
        "stream": False
    })
    if res.status_code == 200:
        return res.json()["message"]["content"], chunks
    else:
        raise Exception(f"Ollama answer failure: {res.text}")

if __name__ == "__main__":
    test_q = "What should I do for a throbbing headache?"
    print(f"Querying (via HyDE + Cross-Encoder): '{test_q}'...")
    ans, context = answer_question(test_q)
    print(f"\nAnswer:\n{ans}")
