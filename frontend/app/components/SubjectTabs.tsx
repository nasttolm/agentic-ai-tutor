'use client';

import { Subject } from '@/lib/api';

interface SubjectTabsProps {
  subjects: Subject[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function SubjectTabs({ subjects, activeTab, onTabChange }: SubjectTabsProps) {
  return (
    <div className="px-6 py-4">
      <div className="max-w-3xl mx-auto flex justify-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => onTabChange(subject.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === subject.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {subject.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
