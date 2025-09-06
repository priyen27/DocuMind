import React from 'react';

// Component to handle comprehensive markdown formatting
const MessageContent = ({ content, className = "" }) => {
  if (!content) return null;
  
  const formatTextWithMarkdown = (text) => {
    const elements = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Check for triple asterisks (***bold italic***)
      const boldItalicMatch = remaining.match(/^(.*?)\*\*\*(.+?)\*\*\*/);
      if (boldItalicMatch) {
        if (boldItalicMatch[1]) {
          elements.push(<span key={key++}>{boldItalicMatch[1]}</span>);
        }
        elements.push(
          <strong key={key++} className="font-bold">
            <em className="italic">{boldItalicMatch[2]}</em>
          </strong>
        );
        remaining = remaining.slice(boldItalicMatch[0].length);
        continue;
      }
      
      // Check for double asterisks (**bold**)
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
      if (boldMatch) {
        if (boldMatch[1]) {
          elements.push(<span key={key++}>{boldMatch[1]}</span>);
        }
        elements.push(
          <strong key={key++} className="font-semibold">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }
      
      // Check for single asterisks (*italic*)
      const italicMatch = remaining.match(/^(.*?)\*([^*]+?)\*/);
      if (italicMatch) {
        if (italicMatch[1]) {
          elements.push(<span key={key++}>{italicMatch[1]}</span>);
        }
        elements.push(
          <em key={key++} className="italic">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }
      
      // Check for backticks (`code`)
      const codeMatch = remaining.match(/^(.*?)`([^`]+?)`/);
      if (codeMatch) {
        if (codeMatch[1]) {
          elements.push(<span key={key++}>{codeMatch[1]}</span>);
        }
        elements.push(
          <code key={key++} className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">
            {codeMatch[2]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }
      
      // Check for links [text](url)
      const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        if (linkMatch[1]) {
          elements.push(<span key={key++}>{linkMatch[1]}</span>);
        }
        elements.push(
          <a 
            key={key++} 
            href={linkMatch[3]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {linkMatch[2]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }
      
      // No more patterns found, add the rest as plain text
      elements.push(<span key={key++}>{remaining}</span>);
      break;
    }
    
    return elements;
  };
  
  const formatLine = (line) => {
    // Handle headers (# ## ###)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = formatTextWithMarkdown(headerMatch[2]);
      const HeaderTag = `h${level}`;
      const headerClasses = {
        1: "text-2xl font-bold mb-2 text-gray-900",
        2: "text-xl font-bold mb-2 text-gray-900",
        3: "text-lg font-semibold mb-1 text-gray-800",
        4: "text-base font-semibold mb-1 text-gray-800",
        5: "text-sm font-semibold mb-1 text-gray-700",
        6: "text-xs font-semibold mb-1 text-gray-700"
      };
      
      return React.createElement(
        HeaderTag,
        { className: headerClasses[level] || "font-semibold" },
        text
      );
    }
    
    // Handle bullet points (- or *)
    const bulletMatch = line.match(/^[\s]*[-*]\s+(.*)$/);
    if (bulletMatch) {
      return (
        <div className="flex items-start gap-2 ml-4 my-1">
          <span className="text-gray-600 mt-1 select-none text-sm">•</span>
          <span>{formatTextWithMarkdown(bulletMatch[1])}</span>
        </div>
      );
    }
    
    // Handle numbered lists (1. 2. etc.)
    const numberMatch = line.match(/^[\s]*(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      return (
        <div className="flex items-start gap-2 ml-4 my-1">
          <span className="text-gray-600 font-medium min-w-[20px] text-sm">{numberMatch[1]}.</span>
          <span>{formatTextWithMarkdown(numberMatch[2])}</span>
        </div>
      );
    }
    
    // Handle blockquotes (>)
    const quoteMatch = line.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      return (
        <div className="border-l-4 border-blue-300 pl-4 ml-2 italic text-gray-700 my-2 bg-blue-50 py-2 rounded-r">
          {formatTextWithMarkdown(quoteMatch[1])}
        </div>
      );
    }
    
    // Handle code blocks (```)
    if (line.startsWith('```')) {
      return (
        <div className="bg-gray-100 border rounded p-2 font-mono text-sm">
          <code>{line.slice(3)}</code>
        </div>
      );
    }
    
    // Handle horizontal rules (---)
    if (line.match(/^[-]{3,}$/)) {
      return <hr className="border-gray-300 my-3 border-t-2" />;
    }
    
    // Regular line with markdown formatting
    return <span>{formatTextWithMarkdown(line)}</span>;
  };
  
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockContent = [];
  const processedLines = [];
  let lineKey = 0;
  
  for (const line of lines) {
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        processedLines.push(
          <div key={lineKey++} className="bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto border">
            <pre className="font-mono text-sm whitespace-pre">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
        const language = line.slice(3).trim();
        if (language) {
          processedLines.push(
            <div key={lineKey++} className="text-xs text-gray-500 mb-1 font-medium">
              {language}
            </div>
          );
        }
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Process regular lines
    const isEmpty = line.trim() === '';
    processedLines.push(
      <div key={lineKey++} className={isEmpty ? 'h-2' : 'mb-1'}>
        {isEmpty ? null : formatLine(line)}
      </div>
    );
  }
  
  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    processedLines.push(
      <div key={lineKey++} className="bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto border">
        <pre className="font-mono text-sm whitespace-pre">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      </div>
    );
  }
  
  return (
    <div className={`markdown-content ${className}`}>
      {processedLines}
    </div>
  );
};

export default MessageContent;