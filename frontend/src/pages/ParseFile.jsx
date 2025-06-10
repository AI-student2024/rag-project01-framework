import React, { useState, useEffect } from 'react';
import RandomImage from '../components/RandomImage';
import { apiBaseUrl } from '../config/config';

const ParseFile = () => {
  // 上传与解析相关状态
  const [file, setFile] = useState(null);
  const [loadingMethod, setLoadingMethod] = useState('pymupdf');
  const [parsingOption, setParsingOption] = useState('all_text');
  const [parsedContent, setParsedContent] = useState(null);
  const [status, setStatus] = useState('');
  const [docName, setDocName] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [fileType, setFileType] = useState('pdf');

  // Tab与管理相关状态
  const [tab, setTab] = useState('preview'); // 'preview' | 'manage'
  const [parsedDocs, setParsedDocs] = useState([]);
  const [parsedLoading, setParsedLoading] = useState(false);
  const [parsedError, setParsedError] = useState('');

  // 文件类型配置
  const fileTypeConfig = {
    pdf: {
      loadingMethods: [
        { value: 'pymupdf', label: 'PyMuPDF' },
        { value: 'pypdf', label: 'PyPDF' },
        { value: 'unstructured', label: 'Unstructured' },
        { value: 'pdfplumber', label: 'PDF Plumber' }
      ],
      parsingOptions: [
        { value: 'all_text', label: 'All Text' },
        { value: 'by_pages', label: 'By Pages' },
        { value: 'by_titles', label: 'By Titles' },
        { value: 'text_and_tables', label: 'Text and Tables' }
      ]
    },
    md: {
      loadingMethods: [
        { value: 'markdown', label: 'Markdown' }
      ],
      parsingOptions: [
        { value: 'all_text', label: 'All Text' },
        { value: 'by_sections', label: 'By Sections' },
        { value: 'text_and_tables', label: 'Text and Tables' }
      ]
    }
  };

  // 上传文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setDocName(baseName);
      
      // 检测文件类型
      const extension = file.name.split('.').pop().toLowerCase();
      const newFileType = extension === 'md' ? 'md' : 'pdf';
      setFileType(newFileType);
      
      // 自动设置加载工具和解析方法
      const config = fileTypeConfig[newFileType];
      setLoadingMethod(config.loadingMethods[0].value);
      setParsingOption(config.parsingOptions[0].value);
    }
  };

  // 解析处理
  const handleProcess = async () => {
    if (!file || !loadingMethod || !parsingOption) {
      setStatus('请选择所有必需的选项');
      return;
    }
    setStatus('处理中...');
    setParsedContent(null);
    setIsProcessed(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('loading_method', loadingMethod);
      formData.append('parsing_option', parsingOption);
      formData.append('file_type', fileType);
      
      const response = await fetch(`${apiBaseUrl}/parse`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setParsedContent(data.parsed_content);
      setStatus('处理完成！');
      setIsProcessed(true);
    } catch (error) {
      console.error('Error:', error);
      setStatus(`错误: ${error.message}`);
    }
  };

  // 解析文档管理相关
  const fetchParsedDocs = async () => {
    setParsedLoading(true);
    setParsedError('');
    try {
      const res = await fetch(`${apiBaseUrl}/parsed-docs`);
      const data = await res.json();
      setParsedDocs(data.documents || []);
    } catch (e) {
      setParsedError('获取解析文档失败');
    }
    setParsedLoading(false);
  };

  // 管理区点击View：切换Tab并预览内容
  const handleViewParsed = async (docName) => {
    try {
      const res = await fetch(`${apiBaseUrl}/parsed-docs/${docName}`);
      const data = await res.json();
      setParsedContent(data);
      setTab('preview');
    } catch (e) {
      setParsedContent(null);
    }
  };

  // 删除解析文档
  const handleDeleteParsed = async (docName) => {
    if (!window.confirm(`确定要删除 ${docName} 吗？`)) return;
    try {
      await fetch(`${apiBaseUrl}/parsed-docs/${docName}`, { method: 'DELETE' });
      setParsedDocs(parsedDocs.filter(d => d.name !== docName));
    } catch (e) {
      alert('删除失败');
    }
  };

  useEffect(() => {
    if (tab === 'manage') fetchParsedDocs();
  }, [tab]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">解析文件</h2>
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧上传区 */}
        <div className="col-span-3 space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">上传文件</label>
              <input
                type="file"
                accept=".pdf,.md"
                onChange={handleFileSelect}
                className="block w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">加载工具</label>
              <select
                value={loadingMethod}
                onChange={(e) => setLoadingMethod(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {fileTypeConfig[fileType].loadingMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">解析方式</label>
              <select
                value={parsingOption}
                onChange={(e) => setParsingOption(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {fileTypeConfig[fileType].parsingOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleProcess}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!file}
            >
              解析文件
            </button>
            {status && <div className="mt-2 text-sm text-gray-500">{status}</div>}
          </div>
        </div>
        {/* 右侧主内容区 */}
        <div className="col-span-9 border rounded-lg bg-white shadow-sm">
          {/* Tab 切换 */}
          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 -mb-px border-b-2 ${tab === 'preview' ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-gray-500'}`}
              onClick={() => setTab('preview')}
            >
              解析预览
            </button>
            <button
              className={`ml-4 px-4 py-2 -mb-px border-b-2 ${tab === 'manage' ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-gray-500'}`}
              onClick={() => setTab('manage')}
            >
              解析管理
            </button>
          </div>
          {/* Tab内容区 */}
          {tab === 'preview' && (
            parsedContent ? (
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-4">解析结果</h3>
                <div className="mb-4 p-3 border rounded bg-gray-100">
                  <h4 className="font-medium mb-2">文档信息</h4>
                  <div className="text-sm text-gray-600">
                    <p>Pages: {parsedContent.metadata?.total_pages}</p>
                    <p>Parsing Method: {parsedContent.metadata?.parsing_method}</p>
                    <p>Timestamp: {parsedContent.metadata?.timestamp && new Date(parsedContent.metadata.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                {console.log('parsedContent', parsedContent)}
                {Array.isArray(parsedContent?.content) && parsedContent.content.length > 0 ? (
                  parsedContent.content.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded bg-gray-50">
                      <div className="font-medium text-sm text-gray-500 mb-1">
                        {item.type}
                        {item.page !== undefined && item.page !== null ? ` - Page ${item.page}` : ''}
                        {item.level ? ` - Level ${item.level}` : ''}
                      </div>
                      {item.title && (
                        <div className="font-bold text-gray-700 mb-2">
                          {item.title}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        {item.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">无内容，建议检查后端返回结构或文档格式</div>
                )}
              </div>
            ) : (
              <RandomImage message="Upload and parse a file to see the results here" />
            )
          )}
          {tab === 'manage' && (
            <div className="space-y-4 p-4">
              <h3 className="text-lg font-semibold mb-4">解析文档管理</h3>
              {parsedLoading ? <div>加载中...</div> : null}
              {parsedError ? <div className="text-red-500">{parsedError}</div> : null}
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {parsedDocs.length === 0 && !parsedLoading && <div>暂无解析文档</div>}
                {parsedDocs.map(doc => (
                  <div key={doc.id} className="p-3 border rounded bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{doc.name}</div>
                      <div className="text-xs text-gray-600">
                        Pages: {doc.metadata?.total_pages || '-'}<br/>
                        Parsing Method: {doc.metadata?.parsing_method || '-'}<br/>
                        Created: {doc.metadata?.timestamp ? new Date(doc.metadata.timestamp).toLocaleString() : '-'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => handleViewParsed(doc.name)}>View</button>
                      <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => handleDeleteParsed(doc.name)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParseFile; 