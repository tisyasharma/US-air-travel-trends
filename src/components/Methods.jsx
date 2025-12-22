function Methods() {
  return (
    <section id="methods" className="section section--alt">
      <div className="container grid-two" data-aos="fade-up">
        <div>
          <p className="kicker">Methods</p>
          <h4>Preprocessing</h4>
          <ul className="list">
            <li>Cleaned BTS T-100 segment data (1999–2024) and standardized airport codes.</li>
            <li>Aggregated routes by year/month with passengers, flights, seats, and load factor.</li>
            <li>Compiled carrier totals per origin and domestic market-share summaries.</li>
          </ul>
        </div>
        <div>
          <h4>Sources & Credits</h4>
          <ul className="list">
            <li>U.S. Bureau of Transportation Statistics (BTS) T-100</li>
            <li>Map & custom visuals: D3.js + TopoJSON (basemap) + custom CSS.</li>
            <li>Charts: Altair/Vega‑Lite (via vega-embed) for stacked areas, heatmaps, scatterplots.</li>
            <li>Data preparation libraries: Python, Pandas, and custom scripts to build web-ready JSON extracts.</li>
            <li>Design: Custom CSS.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export default Methods
