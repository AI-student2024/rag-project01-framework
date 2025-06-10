import React, { useState, useEffect } from 'react';
import RandomImage from '../components/RandomImage';
import { apiBaseUrl } from '../config/config';

const ChunkFile = () => {
  const [loadedDocuments, setLoadedDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [chunkingOption, setChunkingOption] = useState('by_pages');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [minChunkSize, setMinChunkSize] = useState(100);
  const [maxChunkSize, setMaxChunkSize] = useState(5000);
  const [semanticThreshold, setSemanticThreshold] = useState(0.7);
  const [chunks, setChunks] = useState(null);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('chunks');
  const [processingStatus, setProcessingStatus] = useState('');
  const [chunkedDocuments, setChunkedDocuments] = useState([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [mergeEmptyPages, setMergeEmptyPages] = useState(false);
  const [mergeShortPages, setMergeShortPages] = useState(false);
  const [maxPageWords, setMaxPageWords] = useState(2000);
  const [minPageWords, setMinPageWords] = useState(50);
  const paragraphSeparatorOptions = [
    { label: '双换行 (\\n\\n)', value: '\\n\\n' },
    { label: '单换行 (\\n)', value: '\\n' },
    { label: '三个# (###)', value: '###' },
    { label: '自定义', value: 'custom' }
  ];
  const [paragraphSeparator, setParagraphSeparator] = useState('\\n\\n');
  const [customParagraphSeparator, setCustomParagraphSeparator] = useState('');
  const sentenceSeparatorOptions = [
    { label: '中文句号/感叹/问号 (。！？)', value: '。|！|？' },
    { label: '换行 (\n)', value: '\n' },
    { label: '英文句号/感叹/问号 (.!?)', value: '.|!|?' },
    { label: '自定义', value: 'custom' }
  ];
  const [sentenceSeparator, setSentenceSeparator] = useState('。|！|？');
  const [customSentenceSeparator, setCustomSentenceSeparator] = useState('');
  const [keepSeparator, setKeepSeparator] = useState(false);
  const [semanticChunkSize, setSemanticChunkSize] = useState(1000);
  const [semanticChunkOverlap, setSemanticChunkOverlap] = useState(200);
  const [semanticSentenceSeparator, setSemanticSentenceSeparator] = useState('。|！|？');
  const [semanticCustomSentenceSeparator, setSemanticCustomSentenceSeparator] = useState('');
  const [semanticKeepSeparator, setSemanticKeepSeparator] = useState(false);
  const [semanticMinChunkSize, setSemanticMinChunkSize] = useState(1);
  const [semanticMaxChunkSize, setSemanticMaxChunkSize] = useState(5000);
  const semanticSentenceSeparatorOptions = [
    { label: '中文句号/感叹/问号 (。！？)', value: '。|！|？' },
    { label: '换行 (\n)', value: '\n' },
    { label: '英文句号/感叹/问号 (.!?)', value: '.|!|?' },
    { label: '自定义', value: 'custom' }
  ];
  const [hybridMaxChunkSize, setHybridMaxChunkSize] = useState(5000);
  const [hybridMinChunkSize, setHybridMinChunkSize] = useState(1);
  const hybridParagraphSeparatorOptions = [
    { label: '双换行 (\n\n)', value: '\n\n' },
    { label: '单换行 (\n)', value: '\n' },
    { label: '三个# (###)', value: '###' },
    { label: '自定义', value: 'custom' }
  ];
  const [hybridParagraphSeparator, setHybridParagraphSeparator] = useState('\n\n');
  const [hybridCustomParagraphSeparator, setHybridCustomParagraphSeparator] = useState('');
  const hybridSentenceSeparatorOptions = [
    { label: '中文句号/感叹/问号 (。！？)', value: '。|！|？' },
    { label: '换行 (\n)', value: '\n' },
    { label: '英文句号/感叹/问号 (.!?)', value: '.|!|?' },
    { label: '自定义', value: 'custom' }
  ];
  const [hybridSentenceSeparator, setHybridSentenceSeparator] = useState('。|！|？');
  const [hybridCustomSentenceSeparator, setHybridCustomSentenceSeparator] = useState('');
  const [hybridChunkSize, setHybridChunkSize] = useState(1000);
  const [hybridChunkOverlap, setHybridChunkOverlap] = useState(200);
  const [hybridKeepSeparator, setHybridKeepSeparator] = useState(false);
  const [hybridSemanticThreshold, setHybridSemanticThreshold] = useState(0.7);

  useEffect(() => {
    fetchLoadedDocuments();
  }, []);

  const fetchLoadedDocuments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents?type=loaded`);
      const data = await response.json();
      setLoadedDocuments(data.documents);

      const chunkedResponse = await fetch(`${apiBaseUrl}/documents?type=chunked`);
      if (!chunkedResponse.ok) {
        throw new Error(`HTTP error! status: ${chunkedResponse.status}`);
      }
      const chunkedData = await chunkedResponse.json();
      console.log('Chunked documents response:', chunkedData);
      
      if (!chunkedData.documents || !Array.isArray(chunkedData.documents)) {
        console.error('Invalid chunked documents data:', chunkedData);
        return;
      }

      const chunkedDocsWithDetails = await Promise.all(
        chunkedData.documents.map(async (doc) => {
          try {
            const detailResponse = await fetch(`${apiBaseUrl}/documents/${doc.name}?type=chunked`);
            if (!detailResponse.ok) {
              console.error(`Error fetching details for ${doc.name}:`, detailResponse.status);
              return doc;
            }
            const detailData = await detailResponse.json();
            console.log(`Details for ${doc.name}:`, detailData);
            
            return {
              ...doc,
              total_pages: detailData.total_pages,
              total_chunks: detailData.total_chunks,
              chunking_method: detailData.chunking_method,
              chunking_config: detailData.chunking_config,
              timestamp: detailData.timestamp
            };
          } catch (error) {
            console.error(`Error processing document ${doc.name}:`, error);
            return doc;
          }
        })
      );
      
      console.log('Final chunked documents:', chunkedDocsWithDetails);
      setChunkedDocuments(chunkedDocsWithDetails);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setProcessingStatus(`Error fetching documents: ${error.message}`);
    }
  };

  const handleChunk = async () => {
    if (!selectedDoc || !chunkingOption) {
      setStatus('请选择文档和分块方法');
      return;
    }

    setStatus('处理中...');
    setChunks(null);

    try {
      const docId = selectedDoc.endsWith('.json') ? selectedDoc : `${selectedDoc}.json`;
      
      const response = await fetch(`${apiBaseUrl}/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: docId,
          chunking_option: chunkingOption,
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
          min_chunk_size: minChunkSize,
          max_chunk_size: maxChunkSize,
          semantic_threshold: semanticThreshold,
          merge_empty_pages: mergeEmptyPages,
          merge_short_pages: mergeShortPages,
          max_page_words: maxPageWords,
          min_page_words: minPageWords,
          paragraph_separator: paragraphSeparator === 'custom' ? customParagraphSeparator : paragraphSeparator,
          sentence_separators: sentenceSeparator === 'custom' ? customSentenceSeparator.split('|') : sentenceSeparator.split('|'),
          keep_separator: keepSeparator,
          semantic_chunk_size: semanticChunkSize,
          semantic_chunk_overlap: semanticChunkOverlap,
          semantic_sentence_separators: semanticSentenceSeparator === 'custom' ? semanticCustomSentenceSeparator.split('|') : semanticSentenceSeparator.split('|'),
          semantic_keep_separator: semanticKeepSeparator,
          semantic_threshold: semanticThreshold,
          semantic_min_chunk_size: semanticMinChunkSize,
          semantic_max_chunk_size: semanticMaxChunkSize,
          hybrid_max_chunk_size: hybridMaxChunkSize,
          hybrid_min_chunk_size: hybridMinChunkSize,
          hybrid_paragraph_separator: hybridParagraphSeparator === 'custom' ? hybridCustomParagraphSeparator : hybridParagraphSeparator,
          hybrid_sentence_separators: hybridSentenceSeparator === 'custom' ? hybridCustomSentenceSeparator.split('|') : hybridSentenceSeparator.split('|'),
          hybrid_chunk_size: hybridChunkSize,
          hybrid_chunk_overlap: hybridChunkOverlap,
          hybrid_keep_separator: hybridKeepSeparator,
          hybrid_semantic_threshold: hybridSemanticThreshold
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Chunk response:', data);

      setChunks({
        filename: data.filename,
        total_pages: data.total_pages,
        total_chunks: data.total_chunks,
        loading_method: data.loading_method,
        chunking_method: data.chunking_method,
        chunking_config: data.chunking_config,
        timestamp: data.timestamp,
        chunks: data.chunks
      });

      setStatus('分块完成！');
      fetchLoadedDocuments();

    } catch (error) {
      console.error('Error:', error);
      setStatus(`错误: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (docName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents/${docName}?type=chunked`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setProcessingStatus('文档删除成功');
      fetchLoadedDocuments();
      if (selectedDoc === docName) {
        setSelectedDoc('');
        setChunks(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setProcessingStatus(`删除文档时出错: ${error.message}`);
    }
  };

  const handleViewDocument = async (docName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents/${docName}?type=chunked`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setChunks(data);
      setActiveTab('chunks');
    } catch (error) {
      console.error('Error viewing document:', error);
      setProcessingStatus(`查看文档时出错: ${error.message}`);
    }
  };

  const renderAdvancedOptions = () => {
    if (!showAdvancedOptions) return null;

    return (
      <div className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
        {chunkingOption === 'by_pages' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">最小分块大小</label>
              <input
                type="number"
                value={minChunkSize}
                onChange={(e) => setMinChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="50"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最大页面字数</label>
              <input
                type="number"
                value={maxPageWords}
                onChange={(e) => setMaxPageWords(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="500"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最小页面字数</label>
              <input
                type="number"
                value={minPageWords}
                onChange={(e) => setMinPageWords(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="10"
                max="500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mergeEmptyPages"
                checked={mergeEmptyPages}
                onChange={(e) => setMergeEmptyPages(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="mergeEmptyPages" className="text-sm font-medium">
                合并空白页
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mergeShortPages"
                checked={mergeShortPages}
                onChange={(e) => setMergeShortPages(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="mergeShortPages" className="text-sm font-medium">
                合并短页面
              </label>
            </div>
          </>
        )}

        {chunkingOption === 'fixed_size' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">分块大小</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分块重叠大小</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1000"
              />
            </div>
          </>
        )}

        {chunkingOption === 'by_sentences' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">分块大小</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分块重叠大小</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">句子分隔符</label>
              <select
                value={sentenceSeparator}
                onChange={e => setSentenceSeparator(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {sentenceSeparatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {sentenceSeparator === 'custom' && (
                <input
                  type="text"
                  value={customSentenceSeparator}
                  onChange={e => setCustomSentenceSeparator(e.target.value)}
                  className="block w-full p-2 border rounded mt-2"
                  placeholder="请输入自定义分隔符（可用|分隔多个）"
                />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="keepSeparator"
                checked={keepSeparator}
                onChange={e => setKeepSeparator(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="keepSeparator" className="text-sm font-medium">
                保留分隔符
              </label>
            </div>
          </>
        )}

        {chunkingOption === 'semantic' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">分块大小</label>
              <input
                type="number"
                value={semanticChunkSize}
                onChange={e => setSemanticChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分块重叠大小</label>
              <input
                type="number"
                value={semanticChunkOverlap}
                onChange={e => setSemanticChunkOverlap(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">句子分隔符</label>
              <select
                value={semanticSentenceSeparator}
                onChange={e => setSemanticSentenceSeparator(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {semanticSentenceSeparatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {semanticSentenceSeparator === 'custom' && (
                <input
                  type="text"
                  value={semanticCustomSentenceSeparator}
                  onChange={e => setSemanticCustomSentenceSeparator(e.target.value)}
                  className="block w-full p-2 border rounded mt-2"
                  placeholder="请输入自定义分隔符（可用|分隔多个）"
                />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="semanticKeepSeparator"
                checked={semanticKeepSeparator}
                onChange={e => setSemanticKeepSeparator(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="semanticKeepSeparator" className="text-sm font-medium">
                保留分隔符
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">语义相似度阈值</label>
              <input
                type="number"
                value={semanticThreshold}
                onChange={e => setSemanticThreshold(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最小分块大小</label>
              <input
                type="number"
                value={semanticMinChunkSize}
                onChange={e => setSemanticMinChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最大分块大小</label>
              <input
                type="number"
                value={semanticMaxChunkSize}
                onChange={e => setSemanticMaxChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="1000"
                max="10000"
              />
            </div>
          </>
        )}

        {chunkingOption === 'hybrid' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">最大分块大小</label>
              <input
                type="number"
                value={hybridMaxChunkSize}
                onChange={e => setHybridMaxChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="1000"
                max="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最小分块大小</label>
              <input
                type="number"
                value={hybridMinChunkSize}
                onChange={e => setHybridMinChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">段落分隔符</label>
              <select
                value={hybridParagraphSeparator}
                onChange={e => setHybridParagraphSeparator(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {hybridParagraphSeparatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {hybridParagraphSeparator === 'custom' && (
                <input
                  type="text"
                  value={hybridCustomParagraphSeparator}
                  onChange={e => setHybridCustomParagraphSeparator(e.target.value)}
                  className="block w-full p-2 border rounded mt-2"
                  placeholder="请输入自定义分隔符"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">句子分隔符</label>
              <select
                value={hybridSentenceSeparator}
                onChange={e => setHybridSentenceSeparator(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {hybridSentenceSeparatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {hybridSentenceSeparator === 'custom' && (
                <input
                  type="text"
                  value={hybridCustomSentenceSeparator}
                  onChange={e => setHybridCustomSentenceSeparator(e.target.value)}
                  className="block w-full p-2 border rounded mt-2"
                  placeholder="请输入自定义分隔符（可用|分隔多个）"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分块大小（超长段落）</label>
              <input
                type="number"
                value={hybridChunkSize}
                onChange={e => setHybridChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分块重叠（超长段落）</label>
              <input
                type="number"
                value={hybridChunkOverlap}
                onChange={e => setHybridChunkOverlap(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1000"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hybridKeepSeparator"
                checked={hybridKeepSeparator}
                onChange={e => setHybridKeepSeparator(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="hybridKeepSeparator" className="text-sm font-medium">
                保留分隔符
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">语义相似度阈值</label>
              <input
                type="number"
                value={hybridSemanticThreshold}
                onChange={e => setHybridSemanticThreshold(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
          </>
        )}

        {chunkingOption === 'by_paragraphs' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">最小分块大小</label>
              <input
                type="number"
                value={minChunkSize}
                onChange={(e) => setMinChunkSize(Number(e.target.value))}
                className="block w-full p-2 border rounded"
                min="10"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">段落分隔符</label>
              <select
                value={paragraphSeparator}
                onChange={e => setParagraphSeparator(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                {paragraphSeparatorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {paragraphSeparator === 'custom' && (
                <input
                  type="text"
                  value={customParagraphSeparator}
                  onChange={e => setCustomParagraphSeparator(e.target.value)}
                  className="block w-full p-2 border rounded mt-2"
                  placeholder="请输入自定义分隔符"
                />
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderRightPanel = () => {
    return (
      <div className="p-4 w-full h-full flex flex-col">
        <div className="flex mb-4 border-b">
          <button
            className={`px-4 py-2 ${
              activeTab === 'chunks'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('chunks')}
          >
            分块预览
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

        {activeTab === 'chunks' ? (
          chunks ? (
            <div className="w-full">
              <div className="mb-4 p-3 border rounded bg-gray-100">
                <h4 className="font-medium mb-2">文档信息</h4>
                <div className="text-sm text-gray-600">
                  <p>文件名: {chunks.filename}</p>
                  <p>总页数: {chunks.total_pages}</p>
                  <p>总分块数: {chunks.total_chunks}</p>
                  <p>加载方法: {chunks.loading_method}</p>
                  <p>分块方法: {chunks.chunking_method}</p>
                  {chunks.chunking_config && (
                    <>
                      <p>分块大小: {chunks.chunking_config.chunk_size}</p>
                      <p>分块重叠: {chunks.chunking_config.chunk_overlap}</p>
                      <p>最小分块: {chunks.chunking_config.min_chunk_size}</p>
                      <p>最大分块: {chunks.chunking_config.max_chunk_size}</p>
                      {chunks.chunking_config.semantic_threshold && (
                        <p>语义阈值: {chunks.chunking_config.semantic_threshold}</p>
                      )}
                    </>
                  )}
                  <p>处理时间: {chunks.timestamp ? new Date(chunks.timestamp).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {Array.isArray(chunks.chunks) && chunks.chunks.map((chunk) => (
                  <div key={chunk.metadata.chunk_id} className="p-3 border rounded bg-gray-50">
                    <div className="font-medium text-sm text-gray-500 mb-1">
                      分块 {chunk.metadata.chunk_id}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      页码: {chunk.metadata.page_range} | 
                      字数: {chunk.metadata.word_count}
                    </div>
                    <div className="text-sm mt-2">
                      <div className="text-gray-600">{chunk.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RandomImage message="选择文档并创建分块以查看结果" />
          )
        ) : (
          <div className="flex flex-col w-full h-full">
            <h3 className="text-xl font-semibold mb-4">文档管理</h3>
            <div className="space-y-4 w-full">
              {chunkedDocuments.length > 0 ? (
                chunkedDocuments.map((doc) => (
                  <div key={doc.name} className="p-4 border rounded-lg bg-gray-50 w-full">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-grow">
                        <h4 className="font-medium text-lg">{doc.name}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>页数: {doc.total_pages || 'N/A'}</p>
                          <p>分块数: {doc.total_chunks || 'N/A'}</p>
                          <p>分块方法: {doc.chunking_method || 'N/A'}</p>
                          {doc.chunking_config && (
                            <>
                              <p>分块大小: {doc.chunking_config.chunk_size}</p>
                              <p>分块重叠: {doc.chunking_config.chunk_overlap}</p>
                            </>
                          )}
                          <p>处理时间: {doc.timestamp ? new Date(doc.timestamp).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleViewDocument(doc.name)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.name)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8 w-full">
                  暂无分块文档
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">文档分块</h2>
      
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧面板 */}
        <div className="col-span-3 space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">选择文档</label>
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                <option value="">选择文档...</option>
                {loadedDocuments.map((doc) => (
                  <option key={doc.name} value={doc.name}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">分块方法</label>
              <select
                value={chunkingOption}
                onChange={(e) => setChunkingOption(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                <option value="by_pages">按页面分块</option>
                <option value="fixed_size">固定大小分块</option>
                <option value="by_paragraphs">按段落分块</option>
                <option value="by_sentences">按句子分块</option>
                <option value="semantic">语义分块</option>
                <option value="hybrid">混合分块</option>
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-4 py-2 text-blue-500 border border-blue-500 rounded hover:bg-blue-50 mb-4"
            >
              {showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}
            </button>

            {renderAdvancedOptions()}

            <button 
              onClick={handleChunk}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-4"
              disabled={!selectedDoc}
            >
              创建分块
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

export default ChunkFile;