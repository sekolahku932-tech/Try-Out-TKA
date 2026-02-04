
import React from 'react';
import katex from 'katex';

interface MathTextProps {
  text?: string;
  className?: string;
}

const MathText: React.FC<MathTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Split text by $...$ delimiters
  const parts = text.split(/(\$.*?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const tex = part.slice(1, -1);
          try {
            const html = katex.renderToString(tex, {
              throwOnError: false,
              displayMode: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default MathText;
