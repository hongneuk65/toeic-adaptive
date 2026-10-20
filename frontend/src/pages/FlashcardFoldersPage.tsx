import { StudyIcon } from '../components/StudyIcon';
import '../styles/prep-knowledge.css';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

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


  const load = useCallback((signal: AbortSignal) => api<FolderItem[]>('/flashcards/folders', { signal }), []);
  const { data: folders = [], loading, error, reload: loadFolders } = useAsyncResource(load);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('ALL');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  // Modal tạo Folder mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, isModalOpen, () => setIsModalOpen(false));
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 2. Xử lý tạo thư mục mới
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setActionError('Nhập tên thư mục để tiếp tục.');
      return;
    }

    setSubmitting(true);
    setActionError('');
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
      setScope('OWN');
      setSearch('');
      setNotice('Đã tạo thư mục. Mở thư mục để thêm từ vựng.');
      loadFolders();
    } catch (err) {
      console.error('Lỗi khi tạo thư mục:', err);
      setActionError(getErrorMessage(err, 'Chưa tạo được thư mục. Hãy thử lại.'));
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

      setNotice(`Đã xóa thư mục "${folderName}".`);
      loadFolders();
    } catch (err) {
      console.error('Lỗi khi xóa thư mục:', err);
      setActionError(getErrorMessage(err, 'Không thể xóa thư mục này.'));
    }
  };

  // Lọc thư mục theo thanh tìm kiếm
  const filteredFolders = useMemo(() => {
    const query = search.toLowerCase().trim();
    return folders.filter(folder => (scope === 'ALL' || (scope === 'OWN' ? folder.isOwner : !folder.isOwner)) && (!query || `${folder.name} ${folder.description || ''} ${folder.code}`.toLowerCase().includes(query)));
  }, [folders, search, scope]);

  return (
    <div className="page-stack prep-knowledge-page prep-folder-page">
      {notice && <p role="status" className="status-message">{notice}</p>}
      {actionError && <p role="alert" className="status-message text-rose-800">{actionError}</p>}
      {error && <p role="alert" className="status-message">{error} <button className="text-action" onClick={loadFolders}>Thử lại</button></p>}

      {/* 1. THANH TIÊU ĐỀ & CÔNG CỤ TỦ TÀI LIỆU */}
      <PageHeader
        eyebrow="VOCABULARY / HỌC THEO CHỦ ĐỀ"
        title="Thư mục từ vựng"
        description="Chọn một thư mục chuyên đề để bắt đầu lật thẻ và luyện nghe phát âm."
        actions={<button onClick={() => { setActionError(''); setIsModalOpen(true); }} className="primary-button">Tạo thư mục</button>}
      />
      <div className="vocabulary-library-toolbar"><div className="vocabulary-scope" aria-label="Lọc thư mục">{[['ALL','Tất cả'],['OWN','Sổ của tôi'],['LIBRARY','Thư viện chủ đề']].map(([value,label]) => <button key={value} aria-pressed={scope===value} onClick={()=>setScope(value)}>{label}</button>)}</div><label className="min-w-0 w-full sm:w-80"><span className="sr-only">Tìm thư mục từ vựng</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên, mô tả hoặc mã…" className="w-full rounded-lg border border-paper-kraft bg-paper-white px-3 py-2.5 text-sm" /></label><p role="status" className="text-sm text-ink-medium">{filteredFolders.length} thư mục</p></div>

      {/* 2. DANH SÁCH CÁC THƯ MỤC DẠNG HỒ SƠ GIẤY */}
      {loading && folders.length === 0 ? (
        <LoadingSkeleton label="Đang tải thư mục từ vựng..." />
      ) : error && folders.length === 0 ? null : filteredFolders.length === 0 ? (
        <div className="w-full space-y-3 rounded-lg border border-dashed border-paper-kraft bg-paper-white p-10 text-center">
          <p className="text-base font-semibold text-ink-dark">
            {search ? 'Không có thư mục khớp với tìm kiếm.' : 'Chưa có thư mục trong mục này.'}
          </p>
          {search ? <button className="secondary-button" onClick={() => setSearch('')}>Xóa tìm kiếm</button> : <button className="primary-button" onClick={() => { setActionError(''); setIsModalOpen(true); }}>Tạo thư mục</button>}
        </div>
      ) : (
        <ul className="prep-folder-catalog">
          {filteredFolders.map(folder => <li key={folder.id} className="prep-folder-tile" data-owned={folder.isOwner || undefined}><span className="vocabulary-folder-icon"><StudyIcon name={folder.isOwner ? 'cards' : 'book'} /></span>
            <div className="min-w-0 vocabulary-folder-content"><p className="prep-folder-eyebrow">{folder.count} từ vựng</p><h2 className="text-lg font-semibold"><Link className="folder-open-link text-left break-words" to={`/flashcards/${folder.id}`}>{folder.name}</Link></h2>{folder.description && <p className="mt-1 text-sm leading-6 text-ink-medium break-words">{folder.description}</p>}<p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-medium"><span>{folder.isOwner ? 'Của bạn' : `Người tạo: ${folder.authorName}`}</span><span>Mã: {folder.code}</span></p></div>
            <div className="flex items-center gap-3"><span className="primary-button" aria-hidden="true">Mở thư mục →</span>{folder.isOwner && <button onClick={event => handleDeleteFolder(folder.id, folder.name, event)} className="folder-delete-button min-h-11 px-3 text-sm text-rose-800 hover:underline" aria-label={`Xóa thư mục ${folder.name}`}>Xóa</button>}</div>
          </li>)}
        </ul>
      )}

      {/* 3. MODAL TẠO THƯ MỤC MỚI */}
      {isModalOpen && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div ref={dialog} role="dialog" aria-modal="true" aria-label="Tạo thư mục từ vựng" tabIndex={-1} className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-paper-white border border-paper-kraft shadow-paper-light rounded-xl p-5 sm:p-8 relative">


            {actionError && <p role="alert" className="mb-3 text-sm text-rose-800">{actionError}</p>}
            <div className="flex justify-between items-center border-b-2 border-paper-kraft pb-3 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-accent-coral uppercase">

                </span>
                <h2 className="text-xl font-semibold text-ink-dark">
                  Tạo thư mục
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-pencil hover:text-ink-dark font-mono text-base font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label htmlFor="folder-name" className="block text-sm font-medium text-ink-dark mb-1">
                  Tên Thư Mục / Chủ Đề *
                </label>
                <input
                  type="text"
                  required
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: Hợp đồng thương mại, Part 5 nâng cao..."
                  className="w-full px-3 py-2 bg-paper-cream border border-paper-kraft text-ink-dark font-body text-sm rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="folder-description" className="block text-sm font-medium text-ink-dark mb-1">
                  Mô tả ngắn gọn
                </label>
                <textarea
                  id="folder-description"
                  rows={3}
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Ghi chú về nhóm từ vựng trong thư mục này..."
                  className="w-full px-3 py-2 bg-paper-cream border border-paper-kraft text-ink-dark font-body text-sm rounded-lg focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-paper-kraft flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary-button"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-button"
                >
                  {submitting ? 'Đang tạo…' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
