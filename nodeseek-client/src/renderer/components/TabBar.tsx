import { useTabStore } from '../store/tabStore';
import { cn } from '../lib/utils';

const DEFAULT_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23334155'/%3E%3Ctext x='8' y='12' text-anchor='middle' font-size='11' fill='%23cbd5e1'%3EN%3C/text%3E%3C/svg%3E";

export const TabBar = () => {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);

  const handleCreate = () => {
    void window.electronAPI.tabs.create();
  };

  const handleActivate = (id: string) => {
    void window.electronAPI.tabs.activate(id);
  };

  const handleClose = (id: string) => {
    void window.electronAPI.tabs.close(id);
  };

  return (
    <div className="flex items-center h-10 bg-surface-elevated/90 px-2 gap-1 border-b border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            'min-w-[140px] max-w-[220px] flex items-center gap-2 px-3 py-1 rounded-md border-none cursor-pointer text-text-primary text-[13px] transition-colors relative',
            tab.id === activeTabId ? 'bg-accent' : 'bg-transparent hover:bg-white/[0.08]'
          )}
          onClick={() => handleActivate(tab.id)}
        >
          <img
            className="w-4 h-4 rounded object-cover"
            src={tab.favicon ?? DEFAULT_FAVICON}
            alt=""
            onError={(event) => {
              if (event.currentTarget.src !== DEFAULT_FAVICON) {
                event.currentTarget.src = DEFAULT_FAVICON;
              }
            }}
          />
          <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
            {tab.title}
          </span>
          <span
            className="text-xs opacity-60 p-0.5 rounded hover:bg-white/15 hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              handleClose(tab.id);
            }}
          >
            ×
          </span>
        </button>
      ))}
      <button
        title="新建標籤頁"
        onClick={handleCreate}
        className="w-[30px] h-[30px] rounded-full border-none bg-white/[0.07] text-text-primary cursor-pointer text-lg leading-none flex items-center justify-center transition-colors hover:bg-white/15"
      >
        +
      </button>
    </div>
  );
};
