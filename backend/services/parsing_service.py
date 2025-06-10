import logging
from typing import Dict, List
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class ParsingService:
    """
    文档解析服务类
    
    该类提供多种解析策略来提取和构建文档内容，包括：
    - 全文提取
    - 逐页解析
    - 基于标题的分段
    - 文本和表格混合解析
    - Markdown特定解析
    """

    def parse_document(self, text: str, method: str, metadata: dict, page_map: list = None, file_type: str = 'pdf') -> dict:
        """
        使用指定方法解析文档

        参数:
            text (str): 文档的文本内容
            method (str): 解析方法
            metadata (dict): 文档元数据
            page_map (list): 包含每页内容和元数据的字典列表
            file_type (str): 文件类型 ('pdf' 或 'md')

        返回:
            dict: 解析后的文档数据
        """
        try:
            if file_type == 'md':
                return self._parse_markdown(text, method, metadata)
            else:
                return self._parse_pdf(text, method, metadata, page_map)
                
        except Exception as e:
            logger.error(f"Error in parse_document: {str(e)}")
            raise

    def _parse_markdown(self, text: str, method: str, metadata: dict) -> dict:
        """
        解析Markdown文档

        参数:
            text (str): Markdown文本内容
            method (str): 解析方法
            metadata (dict): 文档元数据

        返回:
            dict: 解析后的文档数据
        """
        try:
            parsed_content = []
            
            if method == "all_text":
                parsed_content = self._parse_md_all_text(text)
            elif method == "by_sections":
                parsed_content = self._parse_md_by_sections(text)
            elif method == "text_and_tables":
                parsed_content = self._parse_md_text_and_tables(text)
            else:
                raise ValueError(f"Unsupported parsing method for Markdown: {method}")
            
            # 创建文档级元数据
            document_data = {
                "metadata": {
                    "filename": metadata.get("filename", ""),
                    "file_type": "markdown",
                    "parsing_method": method,
                    "timestamp": datetime.now().isoformat(),
                    "total_sections": len(parsed_content)
                },
                "content": parsed_content
            }
            
            return document_data
            
        except Exception as e:
            logger.error(f"Error in _parse_markdown: {str(e)}")
            raise

    def _parse_pdf(self, text: str, method: str, metadata: dict, page_map: list = None) -> dict:
        """
        解析PDF文档

        参数:
            text (str): PDF文本内容
            method (str): 解析方法
            metadata (dict): 文档元数据
            page_map (list): 包含每页内容和元数据的字典列表

        返回:
            dict: 解析后的文档数据
        """
        try:
            if not page_map:
                raise ValueError("Page map is required for PDF parsing.")
            
            parsed_content = []
            
            if method == "all_text":
                parsed_content = self._parse_pdf_all_text(page_map)
            elif method == "by_pages":
                parsed_content = self._parse_pdf_by_pages(page_map)
            elif method == "by_titles":
                parsed_content = self._parse_pdf_by_titles(page_map)
            elif method == "text_and_tables":
                parsed_content = self._parse_pdf_text_and_tables(page_map)
            else:
                raise ValueError(f"Unsupported parsing method for PDF: {method}")
                
            # 创建文档级元数据
            document_data = {
                "metadata": {
                    "filename": metadata.get("filename", ""),
                    "file_type": "pdf",
                    "total_pages": len(page_map),
                    "parsing_method": method,
                    "timestamp": datetime.now().isoformat()
                },
                "content": parsed_content
            }
            
            return document_data
            
        except Exception as e:
            logger.error(f"Error in _parse_pdf: {str(e)}")
            raise

    def _parse_md_all_text(self, text: str) -> list:
        """
        将Markdown文档中的所有文本内容提取为连续流
        """
        return [{
            "type": "Text",
            "content": text,
            "section": "all"
        }]

    def _parse_md_by_sections(self, text: str) -> list:
        """
        通过识别标题来解析Markdown文档并将内容组织成章节
        """
        sections = []
        current_title = None
        current_content = []
        
        # 使用正则表达式匹配Markdown标题
        lines = text.split('\n')
        for line in lines:
            # 匹配Markdown标题 (兼容半角和全角空格)
            header_match = re.match(r'^\s*(#{1,6})[\s\u3000]+(.+)$', line)
            if header_match:
                # 如果已有标题，保存当前章节
                if current_title:
                    sections.append({
                        "type": "section",
                        "title": current_title,
                        "level": len(header_match.group(1)),
                        "content": '\n'.join(current_content)
                    })
                current_title = header_match.group(2)
                current_content = []
            else:
                current_content.append(line)
        
        # 添加最后一个章节
        if current_title:
            sections.append({
                "type": "section",
                "title": current_title,
                "level": 1,
                "content": '\n'.join(current_content)
            })
            
        return sections

    def _parse_md_text_and_tables(self, text: str) -> list:
        """
        解析Markdown文档中的文本和表格
        """
        parsed_content = []
        current_section = None
        current_content = []
        
        lines = text.split('\n')
        for line in lines:
            # 检测表格开始
            if line.strip().startswith('|') and line.strip().endswith('|'):
                # 保存之前的文本内容
                if current_content:
                    parsed_content.append({
                        "type": "text",
                        "section": current_section,
                        "content": '\n'.join(current_content)
                    })
                    current_content = []
                
                # 收集表格内容
                table_lines = [line]
                i = 1
                while i < len(lines) and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                    table_lines.append(lines[i])
                    i += 1
                
                # 添加表格
                parsed_content.append({
                    "type": "table",
                    "section": current_section,
                    "content": '\n'.join(table_lines)
                })
                
                # 跳过已处理的表格行
                lines = lines[i:]
                continue
            
            # 检测标题 (兼容半角和全角空格)
            header_match = re.match(r'^\s*(#{1,6})[\s\u3000]+(.+)$', line)
            if header_match:
                current_section = header_match.group(2)
                if current_content:
                    parsed_content.append({
                        "type": "text",
                        "section": current_section,
                        "content": '\n'.join(current_content)
                    })
                    current_content = []
            else:
                current_content.append(line)
        
        # 添加最后的内容
        if current_content:
            parsed_content.append({
                "type": "text",
                "section": current_section,
                "content": '\n'.join(current_content)
            })
            
        return parsed_content

    def _parse_pdf_all_text(self, page_map: list) -> list:
        """
        将PDF文档中的所有文本内容提取为连续流
        """
        return [{
            "type": "Text",
            "content": page["text"],
            "page": page["page"]
        } for page in page_map]

    def _parse_pdf_by_pages(self, page_map: list) -> list:
        """
        逐页解析PDF文档，保持页面边界
        """
        return [{
            "type": "Page",
            "page": page["page"],
            "content": page["text"]
        } for page in page_map]

    def _parse_pdf_by_titles(self, page_map: list) -> list:
        """
        通过识别标题来解析PDF文档并将内容组织成章节
        """
        parsed_content = []
        current_title = None
        current_content = []

        for page in page_map:
            lines = page["text"].split('\n')
            for line in lines:
                # 简单启发式：将长度小于60个字符且全部大写的行视为章节标题
                if len(line.strip()) < 60 and line.isupper():
                    if current_title:
                        parsed_content.append({
                            "type": "section",
                            "title": current_title,
                            "content": '\n'.join(current_content),
                            "page": page["page"]
                        })
                    current_title = line.strip()
                    current_content = []
                else:
                    current_content.append(line)

        # 添加最后一个章节
        if current_title:
            parsed_content.append({
                "type": "section",
                "title": current_title,
                "content": '\n'.join(current_content),
                "page": page["page"]
            })

        return parsed_content

    def _parse_pdf_text_and_tables(self, page_map: list) -> list:
        """
        通过分离文本和表格内容来解析PDF文档
        """
        parsed_content = []
        for page in page_map:
            content = page["text"]
            if '|' in content or '\t' in content:
                parsed_content.append({
                    "type": "table",
                    "content": content,
                    "page": page["page"]
                })
            else:
                parsed_content.append({
                    "type": "text",
                    "content": content,
                    "page": page["page"]
                })
        return parsed_content 