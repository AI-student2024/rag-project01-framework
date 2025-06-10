from datetime import datetime
import logging
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import Dict, List, Optional, Union
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

__all__ = ['ChunkingService', 'ChunkingConfig']

class ChunkingConfig:
    """分块配置类"""
    def __init__(
        self,
        method: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        min_chunk_size: int = 1,
        max_chunk_size: int = 5000,
        semantic_threshold: float = 0.7,
        paragraph_separator: str = "\n\n",
        sentence_separators: List[str] = None,
        keep_separator: bool = False,
        merge_empty_pages: bool = False,  # 是否合并空白页
        merge_short_pages: bool = False,  # 是否合并短页面
        max_page_words: int = 2000,  # 最大页面字数
        min_page_words: int = 50,  # 最小页面字数
        # 语义分块专用参数
        semantic_chunk_size: int = 1000,
        semantic_chunk_overlap: int = 200,
        semantic_sentence_separators: List[str] = None,
        semantic_keep_separator: bool = False,
        semantic_min_chunk_size: int = 1,
        semantic_max_chunk_size: int = 5000,
        # 混合分块专用参数
        hybrid_max_chunk_size: int = 5000,
        hybrid_min_chunk_size: int = 1,
        hybrid_paragraph_separator: str = "\n\n",
        hybrid_sentence_separators: List[str] = None,
        hybrid_chunk_size: int = 1000,
        hybrid_chunk_overlap: int = 200,
        hybrid_keep_separator: bool = False,
        hybrid_semantic_threshold: float = 0.7
    ):
        self.method = method
        # 设置默认的分隔符
        default_separators = ["。", "！", "？", "\n", ".", "!", "?", " "]
        self.sentence_separators = sentence_separators or default_separators
        self.keep_separator = keep_separator
        
        # 语义分块专用参数
        self.semantic_chunk_size = semantic_chunk_size
        self.semantic_chunk_overlap = semantic_chunk_overlap
        self.semantic_sentence_separators = semantic_sentence_separators or default_separators
        self.semantic_keep_separator = semantic_keep_separator
        self.semantic_min_chunk_size = semantic_min_chunk_size
        self.semantic_max_chunk_size = semantic_max_chunk_size
        
        # 混合分块专用参数
        self.hybrid_max_chunk_size = hybrid_max_chunk_size
        self.hybrid_min_chunk_size = hybrid_min_chunk_size
        self.hybrid_paragraph_separator = hybrid_paragraph_separator
        self.hybrid_sentence_separators = hybrid_sentence_separators or default_separators
        self.hybrid_chunk_size = hybrid_chunk_size
        self.hybrid_chunk_overlap = hybrid_chunk_overlap
        self.hybrid_keep_separator = hybrid_keep_separator
        self.hybrid_semantic_threshold = hybrid_semantic_threshold
        
        # 根据方法设置必要的参数
        if method == "by_pages":
            self.min_chunk_size = min_chunk_size
            self.merge_empty_pages = merge_empty_pages
            self.merge_short_pages = merge_short_pages
            self.max_page_words = max_page_words
            self.min_page_words = min_page_words
        elif method == "fixed_size":
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap
            self.min_chunk_size = min_chunk_size
        elif method == "by_paragraphs":
            self.min_chunk_size = min_chunk_size
            self.paragraph_separator = paragraph_separator
        elif method == "by_sentences":
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap
            self.min_chunk_size = min_chunk_size
        elif method == "semantic":
            self.semantic_threshold = semantic_threshold
        elif method == "hybrid":
            self.max_chunk_size = hybrid_max_chunk_size
            self.min_chunk_size = hybrid_min_chunk_size
            self.semantic_threshold = hybrid_semantic_threshold
            self.paragraph_separator = hybrid_paragraph_separator
            self.sentence_separators = hybrid_sentence_separators
            self.chunk_size = hybrid_chunk_size
            self.chunk_overlap = hybrid_chunk_overlap
            self.keep_separator = hybrid_keep_separator

class ChunkingService:
    """
    文本分块服务，提供多种文本分块策略
    - by_pages: 按页面分块
    - fixed_size: 按固定大小分块
    - by_paragraphs: 按段落分块
    - by_sentences: 按句子分块
    - semantic: 基于语义的分块
    - hybrid: 混合分块策略
    """
    def __init__(self):
        self.chunking_strategies = {
            "by_pages": self._chunk_by_pages,
            "fixed_size": self._chunk_fixed_size,
            "by_paragraphs": self._chunk_by_paragraphs,
            "by_sentences": self._chunk_by_sentences,
            "semantic": self._chunk_semantic,
            "hybrid": self._chunk_hybrid,
        }

    def chunk_text(
        self,
        text: str,
        method: str,
        metadata: dict,
        page_map: list = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        min_chunk_size: int = 1,
        max_chunk_size: int = 5000,
        semantic_threshold: float = 0.7,
        paragraph_separator: str = "\n\n",
        sentence_separators: List[str] = None
    ) -> dict:
        """
        主入口：根据分块方法分块，返回标准化文档结构
        """
        try:
            if not page_map:
                raise ValueError("Page map is required for chunking.")
            if method not in self.chunking_strategies:
                raise ValueError(f"Unsupported chunking method: {method}")
            
            # 创建配置对象，传入方法名称
            config = ChunkingConfig(
                method=method,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                min_chunk_size=min_chunk_size,
                max_chunk_size=max_chunk_size,
                semantic_threshold=semantic_threshold,
                paragraph_separator=paragraph_separator,
                sentence_separators=sentence_separators
            )
            
            # 全局chunk_id计数器
            chunk_id_counter = [1]
            # 调用具体分块方法
            chunks = self.chunking_strategies[method](page_map, config, chunk_id_counter)
            
            # 根据方法构建配置信息
            config_info = {}
            if method == "by_pages":
                config_info = {"min_chunk_size": config.min_chunk_size}
            elif method == "fixed_size":
                config_info = {
                    "chunk_size": config.chunk_size,
                    "chunk_overlap": config.chunk_overlap,
                    "min_chunk_size": config.min_chunk_size
                }
            elif method == "by_paragraphs":
                config_info = {
                    "min_chunk_size": config.min_chunk_size,
                    "paragraph_separator": getattr(config, "paragraph_separator", "\\n\\n")
                }
            elif method == "by_sentences":
                config_info = {
                    "chunk_size": config.chunk_size,
                    "chunk_overlap": config.chunk_overlap,
                    "min_chunk_size": config.min_chunk_size,
                    "sentence_separators": config.sentence_separators,
                    "keep_separator": config.keep_separator
                }
            elif method == "semantic":
                config_info = {
                    "semantic_threshold": config.semantic_threshold,
                    "semantic_chunk_size": config.semantic_chunk_size,
                    "semantic_chunk_overlap": config.semantic_chunk_overlap,
                    "semantic_sentence_separators": config.semantic_sentence_separators,
                    "semantic_keep_separator": config.semantic_keep_separator,
                    "semantic_min_chunk_size": config.semantic_min_chunk_size,
                    "semantic_max_chunk_size": config.semantic_max_chunk_size
                }
            elif method == "hybrid":
                config_info = {
                    "hybrid_max_chunk_size": config.hybrid_max_chunk_size,
                    "hybrid_min_chunk_size": config.hybrid_min_chunk_size,
                    "hybrid_paragraph_separator": config.hybrid_paragraph_separator,
                    "hybrid_sentence_separators": config.hybrid_sentence_separators,
                    "hybrid_chunk_size": config.hybrid_chunk_size,
                    "hybrid_chunk_overlap": config.hybrid_chunk_overlap,
                    "hybrid_keep_separator": config.hybrid_keep_separator,
                    "hybrid_semantic_threshold": config.hybrid_semantic_threshold
                }
            
            document_data = {
                "filename": metadata.get("filename", ""),
                "total_chunks": len(chunks),
                "total_pages": len(page_map),
                "loading_method": metadata.get("loading_method", ""),
                "chunking_method": method,
                "chunking_config": config_info,
                "timestamp": datetime.now().isoformat(),
                "chunks": chunks
            }
            return document_data
        except Exception as e:
            logger.error(f"Error in chunk_text: {str(e)}")
            raise

    def _chunk_by_pages(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页作为一个chunk，支持页面合并和字数控制"""
        chunks = []
        current_chunk = None
        
        for page_data in page_map:
            page_text = page_data['text'].strip()
            word_count = len(page_text.split())
            
            # 跳过完全空白的页面
            if not page_text and not config.merge_empty_pages:
                continue
            
            # 处理短页面合并
            if config.merge_short_pages and current_chunk and word_count < config.min_page_words:
                # 合并到当前chunk
                current_chunk['content'] += f"\n{page_text}"
                current_chunk['metadata']['word_count'] += word_count
                current_chunk['metadata']['page_range'] = f"{current_chunk['metadata']['page_range']}-{page_data['page']}"
                continue
            
            # 处理超长页面
            if word_count > config.max_page_words:
                # 将超长页面分成多个chunk
                words = page_text.split()
                for i in range(0, len(words), config.max_page_words):
                    chunk_text = ' '.join(words[i:i + config.max_page_words])
                    chunk_metadata = {
                        "chunk_id": chunk_id_counter[0],
                        "page_number": page_data['page'],
                        "page_range": f"{page_data['page']}-{page_data['page']}",
                        "word_count": len(chunk_text.split())
                    }
                    chunks.append({
                        "content": chunk_text,
                        "metadata": chunk_metadata
                    })
                    chunk_id_counter[0] += 1
            else:
                # 创建新的chunk
                chunk_metadata = {
                    "chunk_id": chunk_id_counter[0],
                    "page_number": page_data['page'],
                    "page_range": str(page_data['page']),
                    "word_count": word_count
                }
                current_chunk = {
                    "content": page_text,
                    "metadata": chunk_metadata
                }
                chunks.append(current_chunk)
                chunk_id_counter[0] += 1
            
        return chunks

    def _chunk_fixed_size(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页内容按固定大小分块，chunk_id全局递增"""
        chunks = []
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            length_function=len,
            separators=config.sentence_separators
        )
        
        for page_data in page_map:
            if not page_data['text'].strip():
                continue
            
            # 使用 splitter 分割文本
            page_chunks = splitter.split_text(page_data['text'])
            
            for chunk in page_chunks:
                if len(chunk.strip()) < config.min_chunk_size:
                    continue
                
                chunk_metadata = {
                    "chunk_id": chunk_id_counter[0],
                    "page_number": page_data['page'],
                    "page_range": str(page_data['page']),
                    "word_count": len(chunk.split())
                }
                chunks.append({
                    "content": chunk,
                    "metadata": chunk_metadata
                })
                chunk_id_counter[0] += 1
            
        return chunks

    def _chunk_by_paragraphs(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页内容按段落分块，chunk_id全局递增"""
        chunks = []
        for page_data in page_map:
            if not page_data['text'].strip():
                continue
            paragraphs = [p.strip() for p in page_data['text'].split(config.paragraph_separator) if p.strip()]
            for para in paragraphs:
                if len(para) < config.min_chunk_size:
                    continue
                chunk_metadata = {
                    "chunk_id": chunk_id_counter[0],
                    "page_number": page_data['page'],
                    "page_range": str(page_data['page']),
                    "word_count": len(para.split())
                }
                chunks.append({
                    "content": para,
                    "metadata": chunk_metadata
                })
                chunk_id_counter[0] += 1
        return chunks

    def _chunk_by_sentences(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页内容按句子分块，chunk_id全局递增，支持分隔符和保留分隔符"""
        chunks = []
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            separators=config.sentence_separators,
            keep_separator=getattr(config, 'keep_separator', False)
        )
        for page_data in page_map:
            if not page_data['text'].strip():
                continue
            sentences = splitter.split_text(page_data['text'])
            for sentence in sentences:
                if len(sentence.strip()) < config.min_chunk_size:
                    continue
                chunk_metadata = {
                    "chunk_id": chunk_id_counter[0],
                    "page_number": page_data['page'],
                    "page_range": str(page_data['page']),
                    "word_count": len(sentence.split())
                }
                chunks.append({
                    "content": sentence,
                    "metadata": chunk_metadata
                })
                chunk_id_counter[0] += 1
        return chunks

    def _chunk_semantic(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页内容先按句子分，再基于语义相似度合并，chunk_id全局递增，支持分隔符和保留分隔符、分块大小等"""
        chunks = []
        vectorizer = TfidfVectorizer()
        for page_data in page_map:
            if not page_data['text'].strip():
                continue
            # 先按句子分割
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=config.semantic_chunk_size,
                chunk_overlap=config.semantic_chunk_overlap,
                separators=config.semantic_sentence_separators,
                keep_separator=getattr(config, 'semantic_keep_separator', False)
            )
            sentences = splitter.split_text(page_data['text'])
            if not sentences:
                continue
            tfidf_matrix = vectorizer.fit_transform(sentences)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            current_chunk = [sentences[0]]
            current_length = len(sentences[0].split())
            for i in range(1, len(sentences)):
                sim = similarity_matrix[i-1, i]
                sentence_length = len(sentences[i].split())
                if sim >= config.semantic_threshold and (current_length + sentence_length) <= config.semantic_max_chunk_size:
                    current_chunk.append(sentences[i])
                    current_length += sentence_length
                else:
                    chunk_text = " ".join(current_chunk)
                    if len(chunk_text.strip()) >= config.semantic_min_chunk_size:
                        chunk_metadata = {
                            "chunk_id": chunk_id_counter[0],
                            "page_number": page_data['page'],
                            "page_range": str(page_data['page']),
                            "word_count": len(chunk_text.split())
                        }
                        chunks.append({
                            "content": chunk_text,
                            "metadata": chunk_metadata
                        })
                        chunk_id_counter[0] += 1
                    current_chunk = [sentences[i]]
                    current_length = sentence_length
            # 处理最后一个chunk
            if current_chunk:
                chunk_text = " ".join(current_chunk)
                if len(chunk_text.strip()) >= config.semantic_min_chunk_size:
                    chunk_metadata = {
                        "chunk_id": chunk_id_counter[0],
                        "page_number": page_data['page'],
                        "page_range": str(page_data['page']),
                        "word_count": len(chunk_text.split())
                    }
                    chunks.append({
                        "content": chunk_text,
                        "metadata": chunk_metadata
                    })
                    chunk_id_counter[0] += 1
        return chunks

    def _chunk_hybrid(self, page_map, config, chunk_id_counter) -> List[Dict]:
        """每页内容先按段落分，对超长段落再做语义分块，chunk_id全局递增，支持所有高级参数"""
        chunks = []
        vectorizer = TfidfVectorizer()
        for page_data in page_map:
            if not page_data['text'].strip():
                continue
            # 先按段落分割
            paragraphs = [p.strip() for p in page_data['text'].split(config.hybrid_paragraph_separator) if p.strip()]
            for para in paragraphs:
                if len(para) <= config.hybrid_max_chunk_size:
                    if len(para.strip()) < config.hybrid_min_chunk_size:
                        continue
                    chunk_metadata = {
                        "chunk_id": chunk_id_counter[0],
                        "page_number": page_data['page'],
                        "page_range": str(page_data['page']),
                        "word_count": len(para.split())
                    }
                    chunks.append({
                        "content": para,
                        "metadata": chunk_metadata
                    })
                    chunk_id_counter[0] += 1
                else:
                    # 对超长段落按句子分，再做语义合并
                    splitter = RecursiveCharacterTextSplitter(
                        chunk_size=config.hybrid_chunk_size,
                        chunk_overlap=config.hybrid_chunk_overlap,
                        separators=config.hybrid_sentence_separators,
                        keep_separator=getattr(config, 'hybrid_keep_separator', False)
                    )
                    sentences = splitter.split_text(para)
                    if not sentences:
                        continue
                    tfidf_matrix = vectorizer.fit_transform(sentences)
                    similarity_matrix = cosine_similarity(tfidf_matrix)
                    current_chunk = [sentences[0]]
                    current_length = len(sentences[0].split())
                    for i in range(1, len(sentences)):
                        sim = similarity_matrix[i-1, i]
                        sentence_length = len(sentences[i].split())
                        if sim >= config.hybrid_semantic_threshold and (current_length + sentence_length) <= config.hybrid_max_chunk_size:
                            current_chunk.append(sentences[i])
                            current_length += sentence_length
                        else:
                            chunk_text = " ".join(current_chunk)
                            if len(chunk_text.strip()) >= config.hybrid_min_chunk_size:
                                chunk_metadata = {
                                    "chunk_id": chunk_id_counter[0],
                                    "page_number": page_data['page'],
                                    "page_range": str(page_data['page']),
                                    "word_count": len(chunk_text.split())
                                }
                                chunks.append({
                                    "content": chunk_text,
                                    "metadata": chunk_metadata
                                })
                                chunk_id_counter[0] += 1
                            current_chunk = [sentences[i]]
                            current_length = sentence_length
                    # 处理最后一个chunk
                    if current_chunk:
                        chunk_text = " ".join(current_chunk)
                        if len(chunk_text.strip()) >= config.hybrid_min_chunk_size:
                            chunk_metadata = {
                                "chunk_id": chunk_id_counter[0],
                                "page_number": page_data['page'],
                                "page_range": str(page_data['page']),
                                "word_count": len(chunk_text.split())
                            }
                            chunks.append({
                                "content": chunk_text,
                                "metadata": chunk_metadata
                            })
                            chunk_id_counter[0] += 1
        return chunks
