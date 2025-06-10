// src/pages/LoadFile.jsx
import React, { useState, useEffect } from 'react';
import RandomImage from '../components/RandomImage';
import { apiBaseUrl } from '../config/config';

const LoadFile = () => {
  const [file, setFile] = useState(null);
  const [loadingMethod, setLoadingMethod] = useState('pymupdf');
  const [unstructuredStrategy, setUnstructuredStrategy] = useState('fast');
  const [loadedContent, setLoadedContent] = useState(null);
  const [status, setStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('preview');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [fileType, setFileType] = useState(null);
  
  // 文本文件加载配置
  const [textConfig, setTextConfig] = useState({
    encoding: 'utf-8',
    preserveNewlines: true,
    autoDetectEncoding: false
  });

  // Unstructured 配置
  const [unstructuredConfig, setUnstructuredConfig] = useState({
    strategy: 'fast',
    include_page_breaks: true,
    include_metadata: true,
    languages: ['eng'],
    pdf_image_processor: 'auto'
  });

  // CSV文件加载配置
  const [csvConfig, setCsvConfig] = useState({
    delimiter: '', // 为空表示自动检测
    hasHeader: '', // 为空表示自动检测
    sourceColumn: '' // 为空表示不指定
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      setFileType(fileExt);
      setFile(selectedFile);
      
      // 根据文件类型设置默认加载方法
      if (fileExt === 'txt') {
        setLoadingMethod('text');
      } else if (fileExt === 'pdf') {
        setLoadingMethod('pymupdf');
      } else if (fileExt === 'csv') {
        setLoadingMethod('csv');
      } else if (fileExt === 'md') {
        setLoadingMethod('md');
      }
    }
  };

  const handleTextConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTextConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUnstructuredConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUnstructuredConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCsvConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCsvConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents?type=loaded`);
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleProcess = async () => {
    if (!file || !loadingMethod) {
      setStatus('请选择所有必需的选项');
      return;
    }

    setStatus('加载中...');
    setLoadedContent(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('loading_method', loadingMethod);
      
      if (loadingMethod === 'unstructured') {
        formData.append('strategy', unstructuredConfig.strategy);
        formData.append('chunking_options', JSON.stringify({
          include_page_breaks: unstructuredConfig.include_page_breaks,
          include_metadata: unstructuredConfig.include_metadata,
          languages: unstructuredConfig.languages,
          pdf_image_processor: unstructuredConfig.pdf_image_processor
        }));
      } else if (loadingMethod === 'text') {
        formData.append('text_config', JSON.stringify(textConfig));
      } else if (loadingMethod === 'csv') {
        formData.append('csv_config', JSON.stringify(csvConfig));
      }

      const response = await fetch(`${apiBaseUrl}/load`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLoadedContent(data.loaded_content);
      setStatus('文件加载成功！');
      fetchDocuments();
      setActiveTab('preview');

    } catch (error) {
      console.error('Error:', error);
      setStatus(`错误: ${error.message}`);
      // 显示更详细的错误信息
      if (error.message.includes('CSV')) {
        setStatus(`CSV文件加载错误: ${error.message}\n请检查：\n1. 文件编码是否正确\n2. 分隔符是否匹配\n3. 是否包含特殊字符\n4. 列名是否正确`);
      } else {
        setStatus(`错误: ${error.message}`);
      }
    }
  };

  const handleDeleteDocument = async (docName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents/${docName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStatus('Document deleted successfully');
      fetchDocuments();
      if (selectedDoc?.name === docName) {
        setSelectedDoc(null);
        setLoadedContent(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setStatus(`Error deleting document: ${error.message}`);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      setStatus('Loading document...');
      const response = await fetch(`${apiBaseUrl}/documents/${doc.name}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSelectedDoc(doc);
      setLoadedContent(data);
      setActiveTab('preview');
      setStatus('');
    } catch (error) {
      console.error('Error loading document:', error);
      setStatus(`Error loading document: ${error.message}`);
    }
  };

  const renderRightPanel = () => {
    return (
      <div className="p-4">
        {/* 标签页切换 */}
        <div className="flex mb-4 border-b">
          <button
            className={`px-4 py-2 ${
              activeTab === 'preview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            文档预览
          </button>
          <button
            className={`px-4 py-2 ml-4 ${
              activeTab === 'documents'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('documents')}
          >
            文档管理
          </button>
        </div>

        {/* 内容区域 */}
        {activeTab === 'preview' ? (
          loadedContent ? (
            <div>
              <h3 className="text-xl font-semibold mb-4">Document Content</h3>
              <div className="mb-4 p-3 border rounded bg-gray-100">
                <h4 className="font-medium mb-2">文档信息</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>文件名：{loadedContent.filename || 'N/A'}</p>
                  <p>总页数：{loadedContent.total_pages || 'N/A'}</p>
                  <p>总块数：{loadedContent.total_chunks || 'N/A'}</p>
                  <p>加载方法：{
                    loadedContent.loading_method === 'text' ? 'TextLoader (langchain)' :
                    loadedContent.loading_method === 'pymupdf' ? 'PyMuPDF (fitz)' :
                    loadedContent.loading_method === 'pypdf' ? 'PyPDF' :
                    loadedContent.loading_method === 'pdfplumber' ? 'PDFPlumber' :
                    loadedContent.loading_method === 'unstructured' ? 'Unstructured' :
                    loadedContent.loading_method === 'csv' ? 'CSVLoader (langchain)' :
                    loadedContent.loading_method === 'md' ? 'Markdown (UnstructuredMarkdownLoader)' :
                    loadedContent.loading_method || 'N/A'
                  }</p>
                  {loadedContent.chunking_strategy && (
                    <p>分块策略：{loadedContent.chunking_strategy}</p>
                  )}
                  <p>处理时间：{loadedContent.timestamp ? 
                    new Date(loadedContent.timestamp).toLocaleString() : 'N/A'}</p>
                  
                  {/* 文本文件特有的元数据 */}
                  {loadedContent.loading_method === 'text' && loadedContent.chunks[0]?.metadata && (
                    <>
                      <p>文本编码：{loadedContent.chunks[0].metadata.encoding || 'N/A'}</p>
                      <p>保留换行：{loadedContent.chunks[0].metadata.preserve_newlines ? '是' : '否'}</p>
                      <p>字符数：{loadedContent.chunks[0].metadata.char_count || 'N/A'}</p>
                      <p>词数：{loadedContent.chunks[0].metadata.word_count || 'N/A'}</p>
                    </>
                  )}
                  
                  {/* PDF文件特有的元数据 */}
                  {loadedContent.loading_method !== 'text' && (
                    <>
                      <p>加载策略：{loadedContent.loading_strategy || 'N/A'}</p>
                      <p>分块方法：{loadedContent.chunking_method || 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loadedContent.chunks.map((chunk) => (
                  <div key={chunk.metadata.chunk_id} className="p-3 border rounded bg-gray-50">
                    <div className="font-medium text-sm text-gray-500 mb-1">
                      Chunk {chunk.metadata.chunk_id} (Page {chunk.metadata.page_number})
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      Words: {chunk.metadata.word_count} | Page Range: {chunk.metadata.page_range}
                    </div>
                    <div className="text-sm mt-2">
                      <div className="text-gray-600">{chunk.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RandomImage message="Upload and load a file or select an existing document to see the results here" />
          )
        ) : (
          // 文档管理页面
          <div>
            <h3 className="text-xl font-semibold mb-4">Document Management</h3>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.name} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-lg">{doc.name}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Pages: {doc.metadata?.total_pages || 'N/A'}</p>
                        <p>Chunks: {doc.metadata?.total_chunks || 'N/A'}</p>
                        <p>Loading Method: {doc.metadata?.loading_method || 'N/A'}</p>
                        <p>Chunking Method: {doc.metadata?.chunking_method || 'N/A'}</p>
                        <p>Created: {doc.metadata?.timestamp ? 
                          new Date(doc.metadata.timestamp).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.name)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No documents available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLoadingOptions = () => {
    if (!fileType) return null;

    if (fileType === 'pdf') {
      return (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">加载方法</label>
            <select
              value={loadingMethod}
              onChange={(e) => setLoadingMethod(e.target.value)}
              className="block w-full p-2 border rounded"
            >
              <option value="pymupdf">PyMuPDF</option>
              <option value="pypdf">PyPDF</option>
              <option value="pdfplumber">PDFPlumber</option>
              <option value="unstructured">Unstructured</option>
            </select>
          </div>

          {loadingMethod === 'unstructured' && (
            <div className="space-y-4 p-3 border rounded bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-1">处理策略</label>
                <select
                  name="strategy"
                  value={unstructuredConfig.strategy}
                  onChange={handleUnstructuredConfigChange}
                  className="block w-full p-2 border rounded"
                >
                  <option value="fast">快速模式</option>
                  <option value="hi_res">高精度模式</option>
                  <option value="ocr_only">仅OCR模式</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PDF图像处理</label>
                <select
                  name="pdf_image_processor"
                  value={unstructuredConfig.pdf_image_processor}
                  onChange={handleUnstructuredConfigChange}
                  className="block w-full p-2 border rounded"
                >
                  <option value="auto">自动</option>
                  <option value="tesseract">Tesseract</option>
                  <option value="pytesseract">PyTesseract</option>
                  <option value="none">不处理</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">语言</label>
                <select
                  name="languages"
                  value={unstructuredConfig.languages[0]}
                  onChange={handleUnstructuredConfigChange}
                  className="block w-full p-2 border rounded"
                >
                  <option value="eng">英语</option>
                  <option value="chi_sim">简体中文</option>
                  <option value="chi_tra">繁体中文</option>
                  <option value="jpn">日语</option>
                  <option value="kor">韩语</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include_page_breaks"
                  name="include_page_breaks"
                  checked={unstructuredConfig.include_page_breaks}
                  onChange={handleUnstructuredConfigChange}
                  className="rounded border-gray-300"
                />
                <label htmlFor="include_page_breaks" className="text-sm">
                  包含分页符
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include_metadata"
                  name="include_metadata"
                  checked={unstructuredConfig.include_metadata}
                  onChange={handleUnstructuredConfigChange}
                  className="rounded border-gray-300"
                />
                <label htmlFor="include_metadata" className="text-sm">
                  包含元数据
                </label>
              </div>
            </div>
          )}
        </div>
      );
    } else if (fileType === 'txt') {
      return (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">加载方法</label>
            <select
              value={loadingMethod}
              disabled
              className="block w-full p-2 border rounded bg-gray-100"
            >
              <option value="text">Text</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">文本编码</label>
            <select
              name="encoding"
              value={textConfig.encoding}
              onChange={handleTextConfigChange}
              className="block w-full p-2 border rounded"
            >
              <option value="utf-8">UTF-8</option>
              <option value="gbk">GBK</option>
              <option value="gb2312">GB2312</option>
              <option value="ascii">ASCII</option>
              <option value="iso-8859-1">ISO-8859-1</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoDetectEncoding"
              name="autoDetectEncoding"
              checked={textConfig.autoDetectEncoding}
              onChange={handleTextConfigChange}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoDetectEncoding" className="text-sm">
              自动检测编码
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="preserveNewlines"
              name="preserveNewlines"
              checked={textConfig.preserveNewlines}
              onChange={handleTextConfigChange}
              className="rounded border-gray-300"
            />
            <label htmlFor="preserveNewlines" className="text-sm">
              保留换行符
            </label>
          </div>
        </div>
      );
    } else if (fileType === 'csv') {
      return (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">分隔符</label>
            <select
              name="delimiter"
              value={csvConfig.delimiter}
              onChange={handleCsvConfigChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">自动检测</option>
              <option value=",">逗号 (,)</option>
              <option value=";">分号 (;)</option>
              <option value="\t">制表符 (Tab)</option>
              <option value="|">竖线 (|)</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasHeader"
              name="hasHeader"
              checked={csvConfig.hasHeader === true}
              onChange={e => handleCsvConfigChange({
                target: { name: 'hasHeader', type: 'checkbox', checked: e.target.checked }
              })}
            />
            <label htmlFor="hasHeader" className="text-sm">首行为表头</label>
            <span className="text-xs text-gray-400">（不勾选为自动检测）</span>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">内容列名（可选）</label>
            <input
              type="text"
              name="sourceColumn"
              value={csvConfig.sourceColumn}
              onChange={handleCsvConfigChange}
              placeholder="如 col1 或 name"
              className="block w-full p-2 border rounded"
            />
          </div>
        </div>
      );
    } else if (fileType === 'md') {
      return (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">加载方法</label>
            <select
              value={loadingMethod}
              disabled
              className="block w-full p-2 border rounded bg-gray-100"
            >
              <option value="md">Markdown (UnstructuredMarkdownLoader)</option>
            </select>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">加载文件</h2>
      
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧面板 */}
        <div className="col-span-3 space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">上传文件</label>
              <input
                type="file"
                accept=".pdf,.txt,.csv,.md"
                onChange={handleFileChange}
                className="block w-full border rounded px-3 py-2"
              />
            </div>

            {renderLoadingOptions()}

            <button 
              onClick={handleProcess}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!file}
            >
              加载文件
            </button>
          </div>

          {status && (
            <div className={`p-4 rounded-lg ${
              status.includes('错误') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {status}
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="col-span-9 border rounded-lg bg-white shadow-sm">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
};

export default LoadFile;