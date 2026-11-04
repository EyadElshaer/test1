"use client";

import React, { useEffect, useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare } from "lucide-react";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faq")
      .then((res) => res.json())
      .then((data) => {
        if (data.faqs) {
          setFaqs(data.faqs);
          // Open first 2 items by default
          const initialOpen: Record<string, boolean> = {};
          data.faqs.slice(0, 2).forEach((f: FaqItem) => {
            initialOpen[f.id] = true;
          });
          setOpenItems(initialOpen);
        }
      })
      .catch((err) => console.error("FAQ fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ["ALL", ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filteredFaqs = faqs.filter((f) => {
    const matchesCategory = selectedCategory === "ALL" || f.category === selectedCategory;
    const matchesSearch =
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Title */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/30">
          <HelpCircle className="w-3.5 h-3.5" />
          Help & Support Knowledgebase
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-mono">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Everything you need to know about our digital game keys, Windows licensing, manual payment verification, order tracking, and refund guidelines.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto pt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search help topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-cyan-400"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {cat === "ALL" ? "All Questions" : cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs">Loading FAQs...</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs glass-card rounded-2xl p-6">
            No FAQs found matching your criteria.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = Boolean(openItems[faq.id]);
            return (
              <div
                key={faq.id}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 group"
                >
                  <span className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                    {faq.question}
                  </span>
                  <span className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-white shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 whitespace-pre-line">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support Box */}
      <div className="p-8 rounded-3xl glass-panel border border-cyan-500/20 text-center space-y-3">
        <h3 className="font-bold text-white text-lg">Still have questions?</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Our friendly support team is available during operating hours to assist you with order verification and activation assistance.
        </p>
        <div className="pt-2">
          <a
            href="mailto:support@premikeys.com"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl btn-primary text-xs font-bold"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Support via Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}
