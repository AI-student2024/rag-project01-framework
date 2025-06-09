from .base_loader import BaseLoader
from langchain_community.document_loaders import TextLoader
from unstructured.partition.text import partition_text
import logging

logger = logging.getLogger(__name__)

class TextLoader(BaseLoader):
    """
    文本加载器
    支持使用 LangChain 和 Unstructured 加载 TXT 文件
    """
    
    def load(self, file_path: str, method: str = "langchain", **kwargs) -> str:
        """
        加载文本文件
        
        参数:
            file_path (str): 文件路径
            method (str): 加载方法，支持 'langchain', 'unstructured'
            **kwargs: 其他加载参数
            
        返回:
            str: 提取的文本内容
        """
        try:
            if method == "langchain":
                return self._load_with_langchain(file_path)
            elif method == "unstructured":
                return self._load_with_unstructured(file_path)
            else:
                raise ValueError(f"Unsupported loading method: {method}")
        except Exception as e:
            logger.error(f"Error loading text file: {str(e)}")
            raise
    
    def _load_with_langchain(self, file_path: str) -> str:
        """使用 LangChain 加载文本文件"""
        try:
            loader = TextLoader(file_path=file_path)
            documents = loader.load()
            text_blocks = []
            for doc in documents:
                text_blocks.append({
                    "text": doc.page_content,
                    "page": 1,
                    "metadata": doc.metadata
                })
            self.current_page_map = text_blocks
            self.total_pages = 1
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"LangChain text loading error: {str(e)}")
            raise
    
    def _load_with_unstructured(self, file_path: str) -> str:
        """使用 Unstructured 加载文本文件"""
        try:
            elements = partition_text(file_path)
            text_blocks = []
            for elem in elements:
                text_blocks.append({
                    "text": str(elem),
                    "page": 1
                })
            self.current_page_map = text_blocks
            self.total_pages = 1
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"Unstructured text loading error: {str(e)}")
            raise 