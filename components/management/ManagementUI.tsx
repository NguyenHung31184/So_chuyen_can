import React, { useState } from 'react';

// --- TAB BUTTON ---
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
}
export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap px-2 ${
            active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
        }`}
    >
        {label}
    </button>
);

// --- LIST ITEM CARD ---
interface ListItemCardProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    badges?: { text: string; color: string }[];
    onEdit: () => void;
    onDelete: () => void;
}
export const ListItemCard: React.FC<ListItemCardProps> = ({ title, subtitle, icon, badges, onEdit, onDelete }) => (
    <div className="bg-white p-3 rounded-xl mb-2 flex items-center justify-between active:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                {icon || <span className="font-bold text-sm">{title.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-gray-800 text-sm truncate">{title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                    {badges && badges.map((badge, idx) => (
                        <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                            {badge.text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    </div>
);

// --- COLLAPSIBLE GROUP CARD ---
interface CollapsibleGroupCardProps {
    title: string;
    count: number;
    children: React.ReactNode;
}
export const CollapsibleGroupCard: React.FC<CollapsibleGroupCardProps> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-3">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-gray-400 px-2 py-0.5 rounded-full">{count}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            {isOpen && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-fast">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- MODAL FORM WRAPPER ---
interface ModalFormProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting: boolean;
    children: React.ReactNode;
}
export const ModalForm: React.FC<ModalFormProps> = ({ isOpen, title, onClose, onSubmit, isSubmitting, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">✕</button>
                </div>
                <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {children}
                    <div className="pt-4 sticky bottom-0 bg-white border-t mt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : 'Lưu lại'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};