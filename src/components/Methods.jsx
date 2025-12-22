function Methods() {
  return (
    <section id="methods" className="section section--alt">
      <div className="container" data-aos="fade-up">
        <p className="kicker">Methods</p>
        <div className="grid-two">
          <div>
            <h3>Data & Methodology</h3>
            <p>
              This analysis uses the BTS T-100 Domestic Segment Database from the U.S. Bureau of Transportation
              Statistics, covering 1999-2024.
              <sup className="note-ref">
                <a href="#note-3">[3]</a>
              </sup>{' '}
              Data was cleaned to standardize airport codes, aggregated by year and month, and used to compute load
              factors (passengers divided by seats). Carrier totals were rolled up each month to estimate domestic market
              share. Background context on national air travel trends draws on prior analyses and ACRP summaries.
              <sup className="note-ref">
                [<a href="#note-1">1</a>, <a href="#note-2">2</a>]
              </sup>
            </p>
          </div>
          <div>
            <h3>Development</h3>
            <p>
              The site is built in React with Vite. D3.js and TopoJSON power the route map and custom charts, while
              Vega-Lite drives the capacity scatter + histogram. Data processing and exports to web-ready JSON were
              handled in Python using Pandas and custom scripts.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Methods
