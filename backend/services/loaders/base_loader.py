from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import logging
import os
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class BaseLoader(ABC):
    """
    文档加载器基类
    定义了所有加载器必须实现的接口和通用功能
    """
    
    def __init__(self):
        self.total_pages = 0
        self.current_page_map = []
    
    @abstractmethod
    def load(self, file_path: str, **kwargs) -> str:
        """
        加载文档的抽象方法，所有子类必须实现
        
        参数:
            file_path (str): 文件路径
            **kwargs: 其他加载参数
            
        返回:
            str: 提取的文本内容
        """
        pass
    
    def get_total_pages(self) -> int:
        """
        获取当前加载文档的总页数
        
        返回:
            int: 文档总页数
        """
        return max(page_data['page'] for page_data in self.current_page_map) if self.current_page_map else 0
    
    def get_page_map(self) -> list:
        """
        获取当前文档的页面映射信息
        
        返回:
            list: 包含每页文本内容和页码的列表
        """
        return self.current_page_map
    
    def save_document(self, filename: str, chunks: list, metadata: dict, loading_method: str, **kwargs) -> str:
        """
        保存处理后的文档数据
        
        参数:
            filename (str): 原文件名
            chunks (list): 文档分块列表
            metadata (dict): 文档元数据
            loading_method (str): 使用的加载方法
            **kwargs: 其他保存参数
            
        返回:
            str: 保存的文件路径
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            base_name = os.path.splitext(filename)[0].split('_')[0]
            
            # 构建文档名称
            doc_name = f"{base_name}_{loading_method}_{timestamp}"
            for key, value in kwargs.items():
                if value:
                    doc_name += f"_{value}"
            
            # 构建文档数据结构
            document_data = {
                "filename": str(filename),
                "total_chunks": int(len(chunks)),
                "total_pages": int(metadata.get("total_pages", 1)),
                "loading_method": str(loading_method),
                "timestamp": datetime.now().isoformat(),
                "chunks": chunks,
                **kwargs
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
    
    def _format_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        格式化元数据，确保所有值都是可序列化的
        
        参数:
            metadata (Dict[str, Any]): 原始元数据
            
        返回:
            Dict[str, Any]: 格式化后的元数据
        """
        formatted_metadata = {}
        for key, value in metadata.items():
            try:
                # 尝试 JSON 序列化
                json.dumps({key: value})
                formatted_metadata[key] = value
            except (TypeError, OverflowError):
                # 如果不可序列化，转换为字符串
                formatted_metadata[key] = str(value)
        return formatted_metadata 