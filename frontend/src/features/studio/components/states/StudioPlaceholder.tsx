import React from 'react';
export const StudioPlaceholder: React.FC<{ title: string; text?: string }> = ({ title, text = 'هذه المساحة ستصل في المرحلة التالية من بناء الاستوديو.' }) => <section className="studio-placeholder"><span className="studio-placeholder-kicker">قريبًا</span><h1>{title}</h1><p>{text}</p></section>;
