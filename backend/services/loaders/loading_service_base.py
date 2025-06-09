from pypdf import PdfReader
import pdfplumber
import fitz  # PyMuPDF
import logging
import os
from datetime import datetime
import json
from unstructured.partition.pdf import partition_pdf
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
"""
PDF文档加载服务类
    这个服务类提供了多种PDF文档加载方法，支持不同的加载策略和分块选项。
    主要功能：
    1. 支持多种PDF解析库：
        - PyMuPDF (fitz): 适合快速处理大量PDF文件，性能最佳
        - PyPDF: 适合简单的PDF文本提取，依赖较少
        - pdfplumber: 适合需要处理表格或需要文本位置信息的场景
    
    2. 文档加载特性：
        - 保持页码信息
        - 支持文本分块
        - 提供元数据存储
        - 支持表格识别
 """
class LoadingService:
    """
    PDF文档加载服务类，提供多种PDF文档加载和处理方法。
    
    属性:
        total_pages (int): 当前加载PDF文档的总页数
        current_page_map (list): 存储当前文档的页面映射信息，每个元素包含页面文本和页码
    """
    
    def __init__(self):
        self.total_pages = 0
        self.current_page_map = []
    
    def load_pdf(self, file_path: str, method: str, strategy: str = None, chunking_strategy: str = None, chunking_options: dict = None) -> str:
        """
        加载PDF文档的主方法，支持多种加载策略。

        参数:
            file_path (str): PDF文件路径
            method (str): 加载方法，支持 'pymupdf', 'pypdf', 'pdfplumber', 'unstructured'
            strategy (str, optional): 加载策略，对于unstructured方法支持 'fast', 'hi_res', 'ocr_only'
            chunking_strategy (str, optional): 文本分块策略，可选 'basic', 'by_title'
            chunking_options (dict, optional): 分块选项配置

        返回:
            str: 提取的文本内容
        """
        try:
            if method == "pymupdf":
                return self._load_with_pymupdf(file_path)
            elif method == "pypdf":
                return self._load_with_pypdf(file_path)
            elif method == "pdfplumber":
                return self._load_with_pdfplumber(file_path, chunking_strategy, chunking_options)
            elif method == "unstructured":
                return self._load_with_unstructured(file_path, strategy, chunking_strategy, chunking_options)
            else:
                raise ValueError(f"Unsupported loading method: {method}")
        except Exception as e:
            logger.error(f"Error loading PDF with {method}: {str(e)}")
            raise
    
    def get_total_pages(self) -> int:
        """
        获取当前加载文档的总页数。

        返回:
            int: 文档总页数
        """
        return max(page_data['page'] for page_data in self.current_page_map) if self.current_page_map else 0
    
    def get_page_map(self) -> list:
        """
        获取当前文档的页面映射信息。

        返回:
            list: 包含每页文本内容和页码的列表
        """
        return self.current_page_map
    
    def _load_with_pymupdf(self, file_path: str) -> str:
        """
        使用PyMuPDF库加载PDF文档。
        适合快速处理大量PDF文件，性能最佳。

        参数:
            file_path (str): PDF文件路径

        返回:
            str: 提取的文本内容
        """
        text_blocks = []
        try:
            with fitz.open(file_path) as doc:
                self.total_pages = len(doc)
                for page_num, page in enumerate(doc, 1):
                    text = page.get_text("text")
                    if text.strip():
                        text_blocks.append({
                            "text": text.strip(),
                            "page": page_num
                        })
            self.current_page_map = text_blocks
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"PyMuPDF error: {str(e)}")
            raise
    
    def _load_with_pypdf(self, file_path: str) -> str:
        """
        使用PyPDF库加载PDF文档。
        适合简单的PDF文本提取，依赖较少。

        参数:
            file_path (str): PDF文件路径

        返回:
            str: 提取的文本内容
        """
        try:
            text_blocks = []
            with open(file_path, "rb") as file:
                pdf = PdfReader(file)
                self.total_pages = len(pdf.pages)
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        text_blocks.append({
                            "text": page_text.strip(),
                            "page": page_num
                        })
            self.current_page_map = text_blocks
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"PyPDF error: {str(e)}")
            raise
    
    def _load_with_pdfplumber(self, file_path: str, chunking_strategy: str = "basic", chunking_options: dict = None) -> str:
        """
        使用pdfplumber库加载PDF文档。
        适合需要处理表格或需要文本位置信息的场景。

        参数:
            file_path (str): PDF文件路径
            chunking_strategy (str): 分块策略，默认'basic'
            chunking_options (dict): 分块选项配置

        返回:
            str: 提取的文本内容
        """
        text_blocks = []
        try:
            with pdfplumber.open(file_path) as pdf:
                self.total_pages = len(pdf.pages)
                
                # 设置分块参数
                max_chars = chunking_options.get("maxCharacters", 4000) if chunking_options else 4000
                overlap = chunking_options.get("overlap", 200) if chunking_options else 200
                
                for page_num, page in enumerate(pdf.pages, 1):
                    # 提取文本
                    text = page.extract_text()
                    if not text or not text.strip():
                        continue
                        
                    # 提取表格
                    tables = page.extract_tables()
                    table_texts = []
                    for table in tables:
                        if table:
                            table_text = "\n".join(["\t".join([str(cell) if cell else "" for cell in row]) for row in table])
                            table_texts.append(table_text)
                    
                    # 合并文本和表格
                    page_content = text.strip()
                    if table_texts:
                        page_content += "\n\nTables:\n" + "\n\n".join(table_texts)
                    
                    # 根据分块策略处理文本
                    if chunking_strategy == "basic":
                        # 基本分块
                        chunks = self._chunk_text_basic(page_content, max_chars, overlap)
                        for i, chunk in enumerate(chunks):
                            text_blocks.append({
                                "text": chunk,
                                "page": page_num,
                                "chunk_id": i,
                                "metadata": {
                                    "chunk_type": "text",
                                    "word_count": len(chunk.split()),
                                    "char_count": len(chunk)
                                }
                            })
                    else:
                        # 按标题分块
                        chunks = self._chunk_text_by_title(page_content)
                        for i, chunk in enumerate(chunks):
                            text_blocks.append({
                                "text": chunk,
                                "page": page_num,
                                "chunk_id": i,
                                "metadata": {
                                    "chunk_type": "title_section",
                                    "word_count": len(chunk.split()),
                                    "char_count": len(chunk)
                                }
                            })
            
            self.current_page_map = text_blocks
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"pdfplumber error: {str(e)}")
            raise
    
    def _chunk_text_basic(self, text: str, max_chars: int, overlap: int) -> list:
        """
        基本文本分块方法。

        参数:
            text (str): 要分块的文本
            max_chars (int): 每个块的最大字符数
            overlap (int): 块之间的重叠字符数

        返回:
            list: 分块后的文本列表
        """
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = start + max_chars
            if end > text_len:
                end = text_len
            else:
                # 尝试在句子边界处分割
                last_period = text.rfind('.', start, end)
                if last_period != -1 and last_period > start + max_chars // 2:
                    end = last_period + 1
            
            chunks.append(text[start:end].strip())
            start = end - overlap
        
        return chunks
    
    def _chunk_text_by_title(self, text: str) -> list:
        """
        按标题分块文本。

        参数:
            text (str): 要分块的文本

        返回:
            list: 分块后的文本列表
        """
        # 简单的标题识别规则
        lines = text.split('\n')
        chunks = []
        current_chunk = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 假设标题是短行且以数字和点开头
            if len(line) < 100 and (line[0].isdigit() or line.isupper()):
                if current_chunk:
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
            current_chunk.append(line)
        
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    def save_document(self, filename: str, chunks: list, metadata: dict, loading_method: str, strategy: str = None, chunking_strategy: str = None) -> str:
        """
        保存处理后的文档数据。

        参数:
            filename (str): 原PDF文件名
            chunks (list): 文档分块列表
            metadata (dict): 文档元数据
            loading_method (str): 使用的加载方法
            strategy (str, optional): 使用的加载策略
            chunking_strategy (str, optional): 使用的分块策略

        返回:
            str: 保存的文件路径
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            base_name = filename.replace('.pdf', '').split('_')[0]
            
            # 构建文档名称
            doc_name = f"{base_name}_{loading_method}_{timestamp}"
            if chunking_strategy:
                doc_name = f"{doc_name}_{chunking_strategy}"
            
            # 构建文档数据结构，确保所有值都是可序列化的
            document_data = {
                "filename": str(filename),
                "total_chunks": int(len(chunks)),
                "total_pages": int(metadata.get("total_pages", 1)),
                "loading_method": str(loading_method),
                "chunking_strategy": str(chunking_strategy) if chunking_strategy else None,
                "chunking_method": "loaded",
                "timestamp": datetime.now().isoformat(),
                "chunks": chunks
            }
            
            # 保存到文件
            filepath = os.path.join("01-loaded-docs", f"{doc_name}.json")
            os.makedirs("01-loaded-docs", exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(document_data, f, ensure_ascii=False, indent=2)
                
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving document: {str(e)}")
            raise

    def _load_with_unstructured(self, file_path: str, strategy: str = "fast", chunking_strategy: str = "basic", chunking_options: dict = None) -> str:
        """
        使用unstructured库加载PDF文档。
        支持多种策略和分块选项。

        参数:
            file_path (str): PDF文件路径
            strategy (str): 加载策略，可选 'fast', 'hi_res', 'ocr_only'
            chunking_strategy (str): 分块策略，可选 'basic', 'by_title'
            chunking_options (dict): 分块选项配置

        返回:
            str: 提取的文本内容
        """
        text_blocks = []
        try:
            # 根据策略设置参数
            strategy_params = {
                "fast": {"strategy": "fast"},
                "hi_res": {"strategy": "hi_res"},
                "ocr_only": {"strategy": "ocr_only"}
            }
            
            # 获取策略参数
            params = strategy_params.get(strategy, strategy_params["fast"])
            
            # 使用unstructured加载PDF
            elements = partition_pdf(
                filename=file_path,
                **params
            )
            
            # 处理加载的元素
            current_page = 1
            current_text = []
            
            for element in elements:
                # 获取页码信息
                if hasattr(element, "page_number"):
                    page_num = element.page_number
                else:
                    page_num = current_page
                
                # 获取文本内容
                if hasattr(element, "text"):
                    text = element.text.strip()
                    if text:
                        current_text.append(text)
                
                # 根据分块策略处理文本
                if chunking_strategy == "basic":
                    # 基本分块
                    max_chars = chunking_options.get("maxCharacters", 4000) if chunking_options else 4000
                    overlap = chunking_options.get("overlap", 200) if chunking_options else 200
                    
                    if len(" ".join(current_text)) >= max_chars:
                        text_blocks.append({
                            "text": " ".join(current_text),
                            "page": page_num
                        })
                        current_text = []
                else:
                    # 按标题分块
                    if hasattr(element, "category") and element.category == "Title":
                        if current_text:
                            text_blocks.append({
                                "text": " ".join(current_text),
                                "page": page_num
                            })
                            current_text = []
            
            # 处理剩余的文本
            if current_text:
                text_blocks.append({
                    "text": " ".join(current_text),
                    "page": page_num
                })
            
            self.current_page_map = text_blocks
            return "\n".join(block["text"] for block in text_blocks)
            
        except Exception as e:
            logger.error(f"Unstructured error: {str(e)}")
            raise