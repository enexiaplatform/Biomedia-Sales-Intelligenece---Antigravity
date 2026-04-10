import React from 'react';
import { Beaker, Construction } from "lucide-react";

export default function LabTools() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in text-center p-6">
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
          <Beaker style={{ color: 'var(--brand)' }} size={40} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>Công cụ Lab</h1>
        <div className="flex items-center justify-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-xs mb-6">
          <Construction size={14} />
          Tính năng đang phát triển
        </div>
        <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Chúng tôi đang xây dựng các công cụ chuyên biệt dành cho phòng Lab, bao gồm quản lý thiết bị, 
          theo dõi vòng đời sản phẩm và tích hợp dữ liệu nghiên cứu. 
          Vui lòng quay lại sau!
        </p>
      </div>
      
      <button 
        onClick={() => window.history.back()} 
        className="btn-secondary"
      >
        Quay lại
      </button>
    </div>
  );
}
