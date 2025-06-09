from .base_loader import BaseLoader
from langchain_community.document_loaders import CSVLoader, UnstructuredCSVLoader
from llama_index.readers.database import DatabaseReader
import pandas as pd
import json
import sqlite3
import logging
from typing import Dict, Any, Optional, Union, List

logger = logging.getLogger(__name__)

class StructuredLoader(BaseLoader):
    """
    结构化数据加载器
    支持 CSV、SQLite、JSON 等格式
    """
    
    def load(self, file_path: str, file_type: str, method: str = None, 
             chunking_options: Dict[str, Any] = None) -> str:
        """
        加载结构化数据
        
        参数:
            file_path (str): 文件路径
            file_type (str): 文件类型，支持 'csv', 'sqlite', 'json'
            method (str): 加载方法
            chunking_options (dict, optional): 分块选项配置
            
        返回:
            str: 提取的文本内容
        """
        try:
            if file_type == 'csv':
                return self.load_csv(file_path, method, chunking_options)
            elif file_type in ['db', 'sqlite']:
                return self.load_sqlite(file_path, method, chunking_options)
            elif file_type == 'json':
                return self.load_json(file_path, method)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error loading structured data: {str(e)}")
            raise
    
    def load_csv(self, file_path: str, method: str = "langchain", 
                 chunking_options: Dict[str, Any] = None) -> str:
        """加载 CSV 文件"""
        try:
            if method == "langchain":
                return self._load_with_langchain_csv(file_path, chunking_options)
            elif method == "unstructured":
                return self._load_with_unstructured_csv(file_path)
            elif method == "pandas":
                return self._load_with_pandas_csv(file_path)
            else:
                raise ValueError(f"Unsupported CSV loading method: {method}")
        except Exception as e:
            logger.error(f"Error loading CSV: {str(e)}")
            raise
    
    def load_sqlite(self, file_path: str, method: str = "llamaindex", 
                    chunking_options: Dict[str, Any] = None) -> str:
        """加载 SQLite 数据库"""
        try:
            if method == "llamaindex":
                return self._load_with_llamaindex_sqlite(file_path, chunking_options)
            elif method == "pandas":
                return self._load_with_pandas_sqlite(file_path)
            else:
                raise ValueError(f"Unsupported SQLite loading method: {method}")
        except Exception as e:
            logger.error(f"Error loading SQLite: {str(e)}")
            raise
    
    def load_json(self, file_path: str, method: str = "basic") -> str:
        """加载 JSON 文件"""
        try:
            if method == "basic":
                return self._load_with_basic_json(file_path)
            elif method == "pandas":
                return self._load_with_pandas_json(file_path)
            else:
                raise ValueError(f"Unsupported JSON loading method: {method}")
        except Exception as e:
            logger.error(f"Error loading JSON: {str(e)}")
            raise
    
    def _load_with_langchain_csv(self, file_path: str, 
                                chunking_options: Dict[str, Any] = None) -> str:
        """使用 LangChain 加载 CSV"""
        try:
            csv_args = chunking_options.get("csv_args", {}) if chunking_options else {}
            source_column = chunking_options.get("source_column") if chunking_options else None
            
            loader = CSVLoader(
                file_path=file_path,
                csv_args=csv_args,
                source_column=source_column
            )
            
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
            logger.error(f"LangChain CSV loading error: {str(e)}")
            raise
    
    def _load_with_unstructured_csv(self, file_path: str) -> str:
        """使用 Unstructured 加载 CSV"""
        try:
            loader = UnstructuredCSVLoader(file_path=file_path)
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
            logger.error(f"Unstructured CSV loading error: {str(e)}")
            raise
    
    def _load_with_llamaindex_sqlite(self, file_path: str, 
                                    chunking_options: Dict[str, Any] = None) -> str:
        """使用 LlamaIndex 加载 SQLite"""
        try:
            db_uri = f"sqlite:///{file_path}"
            query = chunking_options.get("query", "SELECT * FROM sqlite_master WHERE type='table';") if chunking_options else "SELECT * FROM sqlite_master WHERE type='table';"
            
            reader = DatabaseReader(uri=db_uri)
            documents = reader.load_data(query=query)
            
            text_blocks = []
            for doc in documents:
                text_blocks.append({
                    "text": doc.text,
                    "page": 1,
                    "metadata": doc.metadata
                })
            
            self.current_page_map = text_blocks
            self.total_pages = 1
            return "\n".join(block["text"] for block in text_blocks)
        except Exception as e:
            logger.error(f"LlamaIndex SQLite loading error: {str(e)}")
            raise
    
    def _load_with_pandas_csv(self, file_path: str) -> str:
        """使用 Pandas 加载 CSV"""
        try:
            df = pd.read_csv(file_path)
            text = df.to_string()
            
            self.current_page_map = [{
                "text": text,
                "page": 1
            }]
            self.total_pages = 1
            return text
        except Exception as e:
            logger.error(f"Pandas CSV loading error: {str(e)}")
            raise
    
    def _load_with_pandas_sqlite(self, file_path: str) -> str:
        """使用 Pandas 加载 SQLite"""
        try:
            text_blocks = []
            conn = sqlite3.connect(file_path)
            
            # 获取所有表名
            tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table';", conn)
            
            for table_name in tables['name']:
                text_blocks.append(f"\nTable: {table_name}")
                text_blocks.append("-" * (len(table_name) + 7))
                
                # 读取表数据
                df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
                text_blocks.append(df.to_string())
            
            conn.close()
            
            text = "\n".join(text_blocks)
            self.current_page_map = [{
                "text": text,
                "page": 1
            }]
            self.total_pages = 1
            return text
        except Exception as e:
            logger.error(f"Pandas SQLite loading error: {str(e)}")
            raise
    
    def _load_with_basic_json(self, file_path: str) -> str:
        """使用基本方法加载 JSON"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                text = self._format_json_data(data)
                
                self.current_page_map = [{
                    "text": text,
                    "page": 1
                }]
                self.total_pages = 1
                return text
        except Exception as e:
            logger.error(f"Basic JSON loading error: {str(e)}")
            raise
    
    def _load_with_pandas_json(self, file_path: str) -> str:
        """使用 Pandas 加载 JSON"""
        try:
            df = pd.read_json(file_path)
            text = df.to_string()
            
            self.current_page_map = [{
                "text": text,
                "page": 1
            }]
            self.total_pages = 1
            return text
        except Exception as e:
            logger.error(f"Pandas JSON loading error: {str(e)}")
            raise
    
    def _format_json_data(self, data: Union[Dict, List], indent: int = 0) -> str:
        """格式化 JSON 数据为易读的文本格式"""
        if isinstance(data, dict):
            lines = []
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    lines.append(f"{'  ' * indent}{key}:")
                    lines.append(self._format_json_data(value, indent + 1))
                else:
                    lines.append(f"{'  ' * indent}{key}: {value}")
            return "\n".join(lines)
        elif isinstance(data, list):
            lines = []
            for item in data:
                if isinstance(item, (dict, list)):
                    lines.append(self._format_json_data(item, indent))
                else:
                    lines.append(f"{'  ' * indent}- {item}")
            return "\n".join(lines)
        else:
            return str(data) 