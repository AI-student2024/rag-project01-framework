import os
from typing import Optional, Dict, Any
from .base_loader import BaseLoader
from .pdf_loader import PDFLoader
from .structured_loader import StructuredLoader
from .text_loader import TextLoader
from .image_loader import ImageLoader
from .ppt_loader import PPTLoader

class LoaderFactory:
    """
    加载器工厂类
    用于创建和管理不同类型的文档加载器
    """
    
    _loaders = {
        'pdf': PDFLoader,
        'csv': StructuredLoader,
        'sqlite': StructuredLoader,
        'db': StructuredLoader,
        'json': StructuredLoader,
        'txt': TextLoader,
        'jpg': ImageLoader,
        'jpeg': ImageLoader,
        'png': ImageLoader,
        'ppt': PPTLoader,
        'pptx': PPTLoader
    }
    
    @classmethod
    def create_loader(cls, file_path: str) -> BaseLoader:
        """
        根据文件类型创建对应的加载器
        
        参数:
            file_path (str): 文件路径
            
        返回:
            BaseLoader: 对应的加载器实例
        """
        file_extension = os.path.splitext(file_path)[1].lower().lstrip('.')
        
        if file_extension in cls._loaders:
            loader_class = cls._loaders[file_extension]
            return loader_class()
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    @classmethod
    def register_loader(cls, file_type: str, loader_class: type) -> None:
        """
        注册新的加载器类型
        
        参数:
            file_type (str): 文件类型
            loader_class (type): 加载器类
        """
        if not issubclass(loader_class, BaseLoader):
            raise ValueError(f"Loader class must inherit from BaseLoader")
        cls._loaders[file_type] = loader_class
    
    @classmethod
    def get_supported_types(cls) -> list:
        """
        获取支持的文件类型列表
        
        返回:
            list: 支持的文件类型列表
        """
        return list(cls._loaders.keys())
    
    @classmethod
    def load_document(cls, file_path: str, method: Optional[str] = None, 
                     **kwargs) -> str:
        """
        加载文档的统一入口
        
        参数:
            file_path (str): 文件路径
            method (str, optional): 加载方法
            **kwargs: 其他加载参数
            
        返回:
            str: 提取的文本内容
        """
        loader = cls.create_loader(file_path)
        file_type = os.path.splitext(file_path)[1].lower().lstrip('.')
        
        if isinstance(loader, StructuredLoader):
            return loader.load(file_path, file_type, method, kwargs.get('chunking_options'))
        else:
            return loader.load(file_path, method, **kwargs) 