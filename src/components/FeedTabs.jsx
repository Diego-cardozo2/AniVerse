import './FeedTabs.css'

const TAB_PARA_TI = 'para_ti'
const TAB_SIGUIENDO = 'siguiendo'

const FeedTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="feed-tabs" role="tablist" aria-label="Tipo de feed">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === TAB_PARA_TI}
        aria-controls="feed-panel-para-ti"
        id="tab-para-ti"
        className={`feed-tab ${activeTab === TAB_PARA_TI ? 'feed-tab-active' : ''}`}
        onClick={() => onTabChange(TAB_PARA_TI)}
      >
        Para ti
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === TAB_SIGUIENDO}
        aria-controls="feed-panel-siguiendo"
        id="tab-siguiendo"
        className={`feed-tab ${activeTab === TAB_SIGUIENDO ? 'feed-tab-active' : ''}`}
        onClick={() => onTabChange(TAB_SIGUIENDO)}
      >
        Siguiendo
      </button>
      <div
        className="feed-tab-indicator"
        aria-hidden="true"
        style={{ transform: activeTab === TAB_SIGUIENDO ? 'translateX(100%)' : 'translateX(0)' }}
      />
    </div>
  )
}

export default FeedTabs
export { TAB_PARA_TI, TAB_SIGUIENDO }
