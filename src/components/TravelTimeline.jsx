function TravelTimeline() {
  const handleDownload = () => {
    // Simple image download
    const link = document.createElement('a')
    link.href = '/annotated_timeline.png'
    link.download = 'timeline-img.png'
    link.click()
  }

  return (
    <>
      <section id="travel-timeline" className="section">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Long-Term Trends</p>
              <h3>Travel Volume Index with Historical Events</h3>
              <p className="muted">
                This annotated timeline highlights how major economic, geopolitical, and industry events
                shaped U.S. air travel demand over the last two decades.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleDownload}>
                Save PNG
              </button>
            </div>
          </div>

          <div className="viz-card" data-aos="fade-up">
            <img
              id="timeline-img"
              src="/annotated_timeline.png"
              alt="Annotated Travel Volume Timeline"
              className="timeline-img"
            />
          </div>

          <p className="caption">
            Major historical events—such as 9/11, the Great Recession, industry mergers, and the onset of COVID-19—correspond strongly to spikes and drops in national passenger volume.
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Visualization Takeaways</h2>
          <div className="viz-block">
            <h3>Travel Volume Index with Historical Events</h3>
            <p>
              This annotated line chart displays how national air travel volume has changed relative to 1999 levels. Key events such as 9/11, recessions, mergers, and COVID-19 are clearly labeled, illustrating how economic and geopolitical shocks directly influence air travel.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default TravelTimeline
