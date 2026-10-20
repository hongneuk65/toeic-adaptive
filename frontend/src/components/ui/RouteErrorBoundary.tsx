import { Component, type ReactNode } from 'react';

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section role="alert" className="page-stack p-6"><h1 className="text-xl font-semibold">Chưa mở được trang học</h1><p>Hãy tải lại trang để thử lại. Bản nháp đã lưu sẽ được khôi phục khi mở bài.</p><button className="primary-button" onClick={() => window.location.reload()}>Tải lại trang</button></section>;
    return this.props.children;
  }
}
