from .base_loader import BaseLoader
from unstructured.partition.ppt import partition_ppt
import logging

logger = logging.getLogger(__name__)

class PPTLoader(BaseLoader):
    """
    PPT 加载器
    支持使用 Unstructured 加载 PPT 文件
    """
    
    def load(self, file_path: str, **kwargs) -> str:
        """
        加载 PPT 文件
        
        参数:
            file_path (str): 文件路径
            **kwargs: 其他加载参数
            
        返回:
            str: 提取的文本内容
        """
        try:
            elements = partition_ppt(file_path)
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
            logger.error(f"Error loading PPT file: {str(e)}")
            raise 