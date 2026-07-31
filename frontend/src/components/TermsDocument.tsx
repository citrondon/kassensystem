/**
 * Contrat de licence et d'utilisation « Mon Comptoir ».
 * Texte juridique canonique (français) — Région Bénin / Zone OHADA.
 * Version du : 29 juillet 2026.
 *
 * Une traduction allemande n'est pas fournie intentionnellement : le contrat
 * est régi par le droit béninois ; seule la version française fait foi.
 */
export const TERMS_VERSION = "2026-07-29";
export const TERMS_UPDATED = "29 juillet 2026";

export function TermsDocument() {
  return (
    <article className="prose-cgu space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <header className="space-y-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Mon Comptoir — Contrat de licence et d&rsquo;utilisation
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Région Bénin / Zone OHADA — Version du {TERMS_UPDATED}
        </p>
      </header>

      <p>
        Les présentes Conditions Générales d&rsquo;Utilisation régissent
        l&rsquo;utilisation du logiciel «&nbsp;Mon Comptoir&nbsp;» (ci-après le
        «&nbsp;Logiciel&nbsp;»), un système de point de vente et de gestion
        commerciale. Elles s&rsquo;appliquent entre l&rsquo;utilisateur
        (ci-après le «&nbsp;Licencié&nbsp;») et l&rsquo;éditeur / exploitant du
        logiciel (ci-après le «&nbsp;Prestataire&nbsp;»).
      </p>
      <p>
        En activant une clé de licence, en créant un compte ou en utilisant le
        Logiciel, le Licencié reconnaît avoir lu, compris et accepté les
        présentes conditions sans réserve.
      </p>

      <Section n="1" title="Champ d&rsquo;application et Droit applicable">
        <P n="1.1">
          Les présentes CGU s&rsquo;appliquent à toute utilisation du Logiciel en
          République du Bénin ainsi que dans l&rsquo;espace juridique de
          l&rsquo;OHADA (Organisation pour l&rsquo;Harmonisation en Afrique du
          Droit des Affaires).
        </P>
        <P n="1.2">
          La relation contractuelle est régie par le droit de la République du
          Bénin, notamment la Loi n°&nbsp;2017-20 portant Code du Numérique,
          ainsi que par les Actes uniformes applicables de l&rsquo;OHADA.
        </P>
        <P n="1.3">
          Toute condition contraire ou dérogeant aux présentes CGU proposée par
          le Licencié ne sera opposable au Prestataire qu&rsquo;après accord
          écrit et préalable de ce dernier.
        </P>
      </Section>

      <Section n="2" title="Périmètre des services et Disponibilité">
        <P n="2.1">
          Le Prestataire met à disposition du Licencié le système POS «&nbsp;Mon
          Comptoir&nbsp;» sous forme de logiciel en tant que service (SaaS) ou
          d&rsquo;application fonctionnant prioritairement en mode déconnecté
          (Offline-First).
        </P>
        <P n="2.2">
          Le Licencié reconnaît que la qualité et la continuité de
          l&rsquo;infrastructure locale de télécommunications et
          d&rsquo;énergie (notamment les coupures de courant ou les
          interruptions du réseau Internet) échappent au contrôle du
          Prestataire. Le Logiciel est conçu pour permettre un usage temporaire
          hors ligne ; la synchronisation des données s&rsquo;effectue dès le
          rétablissement de la connexion.
        </P>
        <P n="2.3">
          Une disponibilité permanente (100&nbsp;%) des serveurs et services en
          ligne n&rsquo;est pas garantie.
        </P>
      </Section>

      <Section n="3" title="Rémunération et Conditions de paiement">
        <P n="3.1">
          Les frais de licence sont déterminés selon la grille tarifaire en
          vigueur et sont libellés en Francs CFA (XOF), en Euros ou en Dollars
          US.
        </P>
        <P n="3.2">
          Le paiement s&rsquo;effectue via les moyens de paiement intégrés au
          système (notamment Mobile Money tels que MTN Mobile Money, Moov Money,
          carte bancaire ou virement bancaire).
        </P>
        <P n="3.3">
          En cas de retard de paiement, le Prestataire se réserve le droit de
          suspendre temporairement l&rsquo;accès au Logiciel après l&rsquo;envoi
          d&rsquo;un préavis de 7 jours resté sans effet.
        </P>
      </Section>

      <Section
        n="4"
        title="Droits sur les données d&rsquo;exploitation et d&rsquo;affaires (Entraînement de l&rsquo;IA et Analyses)"
      >
        <P n="4.1">
          <strong>Cession de droits sur les données non
          personnelles&nbsp;:</strong> Le Licencié concède au Prestataire un
          droit non exclusif, transférable, irrévocable, mondial et gratuit
          d&rsquo;extraire, d&rsquo;analyser et d&rsquo;exploiter l&rsquo;ensemble
          des données d&rsquo;exploitation non personnelles générées dans le
          cadre de l&rsquo;utilisation du Logiciel (notamment statistiques de
          ventes, catégories de produits, fourchettes de prix, mouvements de
          stock, horaires de transaction anonymisés et paramètres de performance
          du système).
        </P>
        <P n="4.2">
          <strong>Finalités d&rsquo;utilisation&nbsp;:</strong> Le Prestataire
          est expressément autorisé à utiliser ces données notamment pour&nbsp;:
          <ul className="list-disc space-y-1 pl-5">
            <li>l&rsquo;optimisation, le développement continu et la correction des erreurs du Logiciel&nbsp;;</li>
            <li>l&rsquo;entraînement, la calibration et l&rsquo;optimisation de modèles d&rsquo;intelligence artificielle (IA), d&rsquo;algorithmes et de systèmes de prévision automatisés&nbsp;;</li>
            <li>la réalisation d&rsquo;études de marché et d&rsquo;analyses sectorielles agrégées.</li>
          </ul>
        </P>
        <P n="4.3">
          <strong>Anonymisation&nbsp;:</strong> Le Prestataire s&rsquo;engage à
          agréger ou à anonymiser les données avant toute exploitation pour ses
          besoins propres, de manière à empêcher toute identification directe ou
          indirecte des secrets d&rsquo;affaires ou de l&rsquo;identité du
          Licencié ou de ses clients. Les données anonymisées ne sont pas
          soumises au droit de la protection des données personnelles.
        </P>
      </Section>

      <Section
        n="5"
        title="Protection des données à caractère personnel (Code du Numérique & APDP)"
      >
        <P n="5.1">
          Le traitement des données à caractère personnel (ex. noms des
          employés, numéros de téléphone des clients) s&rsquo;effectue
          conformément au Livre V de la Loi n°&nbsp;2017-20 portant Code du
          Numérique en République du Bénin et sous le contrôle de
          l&rsquo;Autorité de Protection des Données Personnelles (APDP).
        </P>
        <P n="5.2">
          Dans la mesure où le Licencié saisit des données personnelles relatives
          à ses clients finaux ou à son personnel dans le Logiciel, il agit en
          qualité de Responsable de traitement au sens du Code du Numérique. Le
          Licencié s&rsquo;engage à respecter ses obligations d&rsquo;information
          à l&rsquo;égard des personnes concernées et à recueillir leur
          consentement lorsque la loi l&rsquo;exige.
        </P>
        <P n="5.3">
          Le Prestataire agit en qualité de Sous-traitant pour le compte du
          Licencié, uniquement dans la mesure nécessaire au fonctionnement du
          Logiciel. Le Prestataire ne cédera pas les données personnelles brutes
          à des tiers et ne les utilisera pas à des fins publicitaires propres.
        </P>
        <P n="5.4">
          Le Licencié accepte que les données puissent être hébergées ou
          sauvegardées sur des serveurs certifiés situés hors du Bénin
          (notamment dans l&rsquo;Union européenne ou auprès de fournisseurs
          Cloud mondiaux), sous réserve du maintien de mesures de sécurité
          adéquates.
        </P>
      </Section>

      <Section n="6" title="Obligations du Licencié">
        <P n="6.1">
          Le Licencié est seul responsable de la conformité de son utilisation du
          Logiciel avec les réglementations fiscales et comptables locales en
          République du Bénin (notamment les exigences de la Direction
          Générale des Impôts - DGI concernant la facturation électronique /
          MECeF, le cas échéant).
        </P>
        <P n="6.2">
          Le Licencié s&rsquo;engage à préserver la confidentialité de ses
          identifiants d&rsquo;accès et à prendre toutes les mesures nécessaires
          pour empêcher toute utilisation non autorisée.
        </P>
      </Section>

      <Section n="7" title="Limitation de responsabilité et Force majeure">
        <P n="7.1">
          Le Prestataire ne répond que des dommages résultant d&rsquo;une faute
          intentionnelle ou d&rsquo;une négligence grave de sa part ou de celle
          de ses préposés.
        </P>
        <P n="7.2">
          Le Prestataire ne saurait être tenu responsable des interruptions
          d&rsquo;accès ou dysfonctionnements dus à un cas de Force Majeure. Sont
          notamment considérés comme cas de force majeure&nbsp;: les coupures
          d&rsquo;électricité généralisées, les pannes ou suspensions des réseaux
          de télécommunications imposées par les autorités, les catastrophes
          naturelles ainsi que les actes d&rsquo;autorité publique.
        </P>
        <P n="7.3">
          La responsabilité du Prestataire pour les dommages indirects, le
          manque à gagner ou la perte de données imputable à l&rsquo;absence de
          sauvegardes locales régulières par le Licencié est expressément
          exclue.
        </P>
      </Section>

      <Section n="8" title="Durée et Résiliation">
        <P n="8.1">
          Le contrat est conclu pour la durée prévue par le tarif ou
          l&rsquo;abonnement souscrit.
        </P>
        <P n="8.2">
          Le droit de résiliation unilatérale pour motif légitime reste
          réservé, notamment en cas de violation grave des règles
          d&rsquo;utilisation ou d&rsquo;impayé persistant.
        </P>
      </Section>

      <Section n="9" title="Règlement des litiges et Juridiction compétente">
        <P n="9.1">
          Tout différend découlant du présent contrat ou en relation avec
          celui-ci fera l&rsquo;objet d&rsquo;une tentative de règlement à
          l&rsquo;amiable entre les parties.
        </P>
        <P n="9.2">
          À défaut d&rsquo;accord amiable dans un délai de trente (30) jours, le
          litige sera soumis à la compétence exclusive du Tribunal de Commerce
          de Cotonou (République du Bénin) ou, au choix du Prestataire, à la
          Cour Commune de Justice et d&rsquo;Arbitrage (CCJA) de
          l&rsquo;OHADA.
        </P>
      </Section>
    </article>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        {n}. {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function P({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-slate-800 dark:text-slate-200">
        {n}
      </span>{" "}
      {children}
    </p>
  );
}
