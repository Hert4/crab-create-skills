import { useEffect, useState } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { X, AlertCircle, Settings, Wifi, KeyRound } from 'lucide-react';

function parseError(raw: string): { title: string; body: string; icon: typeof AlertCircle; action?: { label: string; tab: string } } {
  const msg = raw.toLowerCase();

  if (msg.includes('api key') || msg.includes('401') || msg.includes('unauthorized') || msg.includes('authentication')) {
    return {
      title: 'API Key không hợp lệ',
      body: 'Kiểm tra lại API Key trong Settings.',
      icon: KeyRound,
      action: { label: 'Mở Settings', tab: 'settings' },
    };
  }
  if (msg.includes('base url') || msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('econnrefused') || msg.includes('404')) {
    return {
      title: 'Không kết nối được API',
      body: 'Kiểm tra Base URL và kết nối mạng trong Settings.',
      icon: Wifi,
      action: { label: 'Mở Settings', tab: 'settings' },
    };
  }
  if (msg.includes('model') || msg.includes('modelstrong') || msg.includes('modelfast') || msg.includes('model not found') || msg.includes('no model')) {
    return {
      title: 'Model chưa được cấu hình',
      body: 'Điền Strong Model và Fast Model trong Settings.',
      icon: Settings,
      action: { label: 'Mở Settings', tab: 'settings' },
    };
  }
  if (msg.includes('cancelled') || msg.includes('cancel')) {
    return {
      title: 'Đã dừng',
      body: 'Quá trình tạo skill đã bị hủy.',
      icon: AlertCircle,
    };
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
    return {
      title: 'Rate limit / Quota vượt quá',
      body: 'API đang bị giới hạn. Vui lòng thử lại sau.',
      icon: AlertCircle,
    };
  }
  if (msg.includes('json') || msg.includes('parse') || msg.includes('syntax')) {
    return {
      title: 'Lỗi phân tích dữ liệu',
      body: 'Model trả về dữ liệu không hợp lệ. Thử lại hoặc đổi model.',
      icon: AlertCircle,
    };
  }

  return {
    title: 'Có lỗi xảy ra',
    body: raw.length > 120 ? raw.slice(0, 120) + '…' : raw,
    icon: AlertCircle,
  };
}

interface Props {
  onNavigate?: (tab: string) => void;
}

export function ErrorToast({ onNavigate }: Props) {
  const { error, phase } = useCompilationStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (phase === 'error' && error && error !== dismissed) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 7000);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [phase, error]);

  if (!visible || !error) return null;

  const { title, body, icon: Icon, action } = parseError(error);

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        left: 12,
        right: 12,
        zIndex: 100,
        background: 'var(--crab-bg-secondary)',
        border: '1px solid rgba(248, 113, 113, 0.4)',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(248,113,113,0.15)',
        animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'rgba(248, 113, 113, 0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 15, height: 15, color: '#f87171' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--crab-text-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {body}
        </div>
        {action && onNavigate && (
          <button
            onClick={() => { onNavigate(action.tab); setVisible(false); }}
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--crab-accent)',
              background: 'var(--crab-accent-light)',
              border: '1px solid var(--crab-accent-medium)',
              borderRadius: 6,
              padding: '3px 8px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {action.label} →
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => { setVisible(false); setDismissed(error); }}
        style={{
          flexShrink: 0, background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--crab-text-muted)', padding: 2,
          borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>

      {/* Auto-dismiss progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        borderRadius: '0 0 12px 12px',
        background: 'rgba(248, 113, 113, 0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: '#f87171',
          animation: 'toastTimer 7s linear forwards',
        }} />
      </div>
    </div>
  );
}
