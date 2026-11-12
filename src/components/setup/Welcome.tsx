export function Welcome({ onStart }: { onStart: () => void }) {
  return <section className="mission-welcome" aria-labelledby="welcome-title">
    <div className="mission-hero">
      <div>
        <span className="eyebrow">GTAC · A COOPERATIVE SCIENCE ADVENTURE</span>
        <h1 id="welcome-title">A Game of Hives</h1>
        <p className="mission-subtitle">Can you save the Queen Bee?</p>
        <h2>The challenge</h2>
        <p>Bees pollinate flowering plants, helping plants make seeds and grow many of the foods we eat. Pesticides, extreme weather, habitat loss and Varroa mites can put bee colonies at risk.</p>
        <p>Your team must work together to protect your hives, collect resources and keep your colony healthy.</p>
      </div>
      <div className="pollination-art" role="img" aria-label="A bee carries pollen between flowers, helping plants produce seeds and food">
        <span className="art-bee">🐝</span><span className="art-flower">✿</span>
        <span className="art-caption">Flowers → pollination → food</span>
      </div>
    </div>
    <div className="mission-cards">
      <article className="win-card"><span aria-hidden="true">★</span><h2>How to Win</h2><p>Work together to save the Queen Bee! Collect resources and trade for honey and bee bread. Hold <strong>10 points at the end of a turn</strong> to win.</p></article>
      <article className="lose-card"><span aria-hidden="true">!</span><h2>How You Can Lose</h2><p>Environmental challenges can damage your garden and hives. If you lose <strong>all your healthy hives</strong>, your team loses. Discuss your choices and protect the colony together.</p></article>
    </div>
    <div className="mission-bottom"><section><h2>We are learning to…</h2><ul><li>Explain why bees and pollination matter.</li><li>Explore threats to bee colonies.</li><li>Make decisions and solve problems together.</li><li>Use resources strategically to protect a colony.</li></ul></section>
      <div><button className="primary-button" type="button" onClick={onStart}>Start Game <span aria-hidden="true">→</span></button><p>Meet your team, build a garden, learn as you play.</p></div>
    </div>
  </section>;
}
