import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface FolderItem {
  id: number | string;
  name: string;
  description?: string;
  count: number;
  authorName: string;
  isOwner: boolean;
  code: string;
}

export const FlashcardFoldersPage: React.FC = () => {
  const navigate = useNavigate();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal tạo Folder mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Tải danh sách thư mục từ backend
  const loadFolders = () => {
    setLoading(true);
    api('/flashcards/folders')
      .then((res: any) => {
        // Unwrap dữ liệu an toàn dù backend trả về dạng nào
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        setFolders(list);
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách thư mục:', err);
        setFolders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFolders();
  }, []);

  // 2. Xử lý tạo thư mục mới
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      alert('Vui lòng nhập tên thư mục từ vựng.');
      return;
    }

    setSubmitting(true);
    try {
      await api('/flashcards/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDesc.trim() || undefined,
        }),
      });

      setNewFolderName('');
      setNewFolderDesc('');
      setIsModalOpen(false);
      loadFolders();
    } catch (err: any) {
      console.error('Lỗi khi tạo thư mục:', err);
      alert(err.response?.data?.message || err.message || 'Không thể tạo thư mục mới.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Xử lý xóa thư mục (Chỉ chủ sở hữu mới có quyền xóa)
  const handleDeleteFolder = async (folderId: number | string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click mở vào chi tiết folder

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa thư mục "${folderName}" không?\nToàn bộ từ vựng bên trong thư mục này sẽ bị xóa vĩnh viễn!`
    );

    if (!confirmed) return;

    try {
      await api(`/flashcards/folders/${folderId}`, {
        method: 'DELETE',
      });

      alert(`Đã xóa thành công thư mục "${folderName}".`);
      loadFolders();
    } catch (err: any) {
      console.error('Lỗi khi xóa thư mục:', err);
      alert(err.response?.data?.message || err.message || 'Không thể xóa thư mục này.');
    }
  };

  // Lọc thư mục theo thanh tìm kiếm
  const filteredFolders = useMemo(() => {
    if (!search.trim()) return folders;
    const q = search.toLowerCase().trim();
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        f.code.toLowerCase().includes(q)
    );
  }, [folders, search]);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. THANH TIÊU ĐỀ & CÔNG CỤ TỦ TÀI LIỆU */}
      <div className="w-full bg-paper-white p-6 md:p-8 border-2 border-paper-kraft shadow-paper-subtle rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
        <div className="staple top-3 left-6" />
        <div className="tape tape-mint w-28 top-[-10px] right-8" />

        <div>
          <span className="font-mono text-xs font-bold text-accent-coral uppercase tracking-wider block mb-1">
            HỆ THỐNG GHI NHỚ TỪ VỰNG TOEIC
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-dark">
            Tủ Thư Mục Flashcard
          </h1>
          <p className="font-hand text-lg text-ink-medium mt-1">
            Chọn một thư mục chuyên đề để bắt đầu lật thẻ và luyện nghe phát âm
          </p>
        </div>

        {/* Cụm công cụ tìm kiếm và nút tạo thư mục */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã folder..."
            className="px-4 py-2.5 bg-paper-cream border-2 border-paper-kraft font-body text-xs text-ink-dark rounded-sm focus:outline-none focus:border-slate-900 w-full sm:w-64"
          />

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-accent-coral hover:bg-[#c9664c] text-white font-hand text-lg font-bold rounded-sm shadow-paper-subtle transition uppercase cursor-pointer"
          >
            + TẠO FOLDER MỚI
          </button>
        </div>
      </div>

      {/* 2. DANH SÁCH CÁC THƯ MỤC DẠNG HỒ SƠ GIẤY */}
      {loading ? (
        <div className="w-full bg-paper-white p-16 border-2 border-paper-kraft text-center font-hand text-2xl text-ink-light">
          Đang mở tủ và lấy danh sách thư mục...
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="w-full bg-paper-white p-16 text-center border-2 border-dashed border-paper-kraft rounded-sm space-y-3">
          <p className="font-hand text-2xl text-ink-medium">
            Chưa tìm thấy thư mục từ vựng nào phù hợp.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-slate-900 text-white font-hand text-lg font-bold rounded cursor-pointer"
          >
            TẠO THƯ MỤC ĐẦU TIÊN
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => navigate(`/flashcards/${folder.id}`)}
              className="relative bg-paper-white border-2 border-paper-kraft p-6 rounded-sm shadow-paper-subtle hover:shadow-paper-medium hover:-translate-y-1 transition duration-200 cursor-pointer select-none flex flex-col justify-between min-h-[220px]"
            >
              {/* Trang trí ghim bấm */}
              <div className="staple top-2 left-3" />

              <div>
                {/* Header ô thẻ: Mã thư mục, nhãn quyền và nút XÓA */}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold text-ink-light">
                    {folder.code}
                  </span>

                  <div className="flex items-center gap-2">
                    {folder.isOwner && (
                      <>
                        <span className="bg-slate-900 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase">
                          CỦA BẠN
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                          className="text-accent-coral hover:text-red-700 font-mono text-xs font-bold px-2 py-0.5 border border-accent-coral/50 hover:border-accent-coral rounded transition bg-paper-cream"
                          title="Xóa thư mục này vĩnh viễn"
                        >
                          [ XÓA ]
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tiêu đề & Mô tả */}
                <h3 className="font-display text-3xl font-bold text-ink-dark leading-tight mt-1">
                  {folder.name}
                </h3>
                <p className="font-hand text-base text-ink-medium mt-1.5 line-clamp-2">
                  {folder.description || `Thư mục chuyên đề từ vựng ${folder.name}.`}
                </p>
              </div>

              {/* Footer ô thẻ: Tác giả và Số lượng từ */}
              <div className="mt-5 pt-3 border-t border-dashed border-paper-kraft flex justify-between items-center">
                <span className="font-hand text-sm text-ink-light">
                  Người tạo:{' '}
                  <strong className="text-ink-dark">{folder.authorName}</strong>
                </span>
                <span className="font-mono text-xs font-bold text-accent-navy bg-paper-cream px-2 py-0.5 border border-paper-kraft rounded-xs">
                  {folder.count} TỪ VỰNG
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. MODAL TẠO THƯ MỤC MỚI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-paper-white border-2 border-paper-kraft shadow-paper-heavy rounded-sm p-8 relative">
            <div className="staple top-3 left-6" />
            <div className="tape tape-mint w-24 top-[-10px] right-8" />

            <div className="flex justify-between items-center border-b-2 border-paper-kraft pb-3 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-accent-coral uppercase">
                  TỦ SỔ TAY CÁ NHÂN
                </span>
                <h2 className="font-display text-3xl font-bold text-ink-dark">
                  Tạo Thư Mục Mới
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-pencil hover:text-ink-dark font-mono text-base font-bold cursor-pointer"
              >
                [ ĐÓNG ]
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block font-hand text-lg text-ink-dark mb-1">
                  Tên Thư Mục / Chủ Đề *
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: Hợp đồng thương mại, Part 5 nâng cao..."
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-hand text-lg text-ink-dark mb-1">
                  Mô tả ngắn gọn
                </label>
                <textarea
                  rows={3}
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Ghi chú về nhóm từ vựng trong thư mục này..."
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-paper-kraft flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-paper-cream border border-paper-kraft font-hand text-lg font-bold text-ink-medium rounded cursor-pointer"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-hand text-lg font-bold rounded shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'ĐANG TẠO...' : 'TẠO THƯ MỤC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};