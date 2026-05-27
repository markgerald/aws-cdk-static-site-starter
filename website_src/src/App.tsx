import './styles.css';

const statusCards = [
  {
    label: 'Origem',
    title: 'S3 bloqueado ao público',
    description: 'Arquivos acessíveis apenas por requisições assinadas pelo CloudFront.',
  },
  {
    label: 'CDN',
    title: 'HTTPS com redirect',
    description: 'CloudFront entrega o conteúdo usando o certificado ACM do domínio.',
  },
  {
    label: 'Deploy',
    title: 'GitHub Actions + OIDC',
    description: 'Sem access keys fixas; o workflow assume uma role IAM temporária.',
  },
];

export function App() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__copy">
          <p className="eyebrow">AWS CDK + CloudFront + S3 privado</p>
          <h1 id="page-title">Site estático seguro, simples e barato.</h1>
          <p className="lede">
            Uma base pronta para publicar HTML, CSS e JavaScript com HTTPS, CDN global,
            Origin Access Control e DNS gerenciado pela Cloudflare.
          </p>
          <div className="actions" aria-label="Links principais">
            <a className="button button--primary" href="https://docs.aws.amazon.com/cdk/" rel="noreferrer">
              AWS CDK
            </a>
            <a
              className="button button--secondary"
              href="https://developers.cloudflare.com/dns/"
              rel="noreferrer"
            >
              Cloudflare DNS
            </a>
          </div>
        </div>

        <div className="signal" aria-label="Fluxo da arquitetura">
          <div className="signal__node">Cloudflare DNS</div>
          <div className="signal__line" />
          <div className="signal__node signal__node--active">CloudFront HTTPS</div>
          <div className="signal__line" />
          <div className="signal__node">S3 privado + OAC</div>
        </div>
      </section>

      <section className="status-grid" aria-label="Detalhes do deploy">
        {statusCards.map((card, index) => (
          <article
            className="status-card is-visible"
            key={card.label}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span className="status-card__label">{card.label}</span>
            <strong>{card.title}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
