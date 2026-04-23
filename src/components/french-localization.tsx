import { useEffect } from 'react'

const exactTranslations = new Map<string, string>([
  ['Settings', 'Paramètres'],
  ['Profile', 'Profil'],
  ['Account', 'Compte'],
  ['Appearance', 'Apparence'],
  ['Notifications', 'Notifications'],
  ['Display', 'Affichage'],
  ['Search', 'Rechercher'],
  ['Payments', 'Paiements'],
  ['Schools', 'Écoles'],
  ['Users', 'Utilisateurs'],
  ['Parents', 'Parents'],
  ['Directors', 'Directeurs'],
  ['Children', 'Enfants'],
  ['Support', 'Support'],
  ['Support Requests', 'Demandes de support'],
  ['Collecting agents', 'Agents collecteurs'],
  ['Collecting Agents', 'Agents collecteurs'],
  ['School merchandise', 'Articles scolaires'],
  ['School Merchandise', 'Articles scolaires'],
  ['Commission Admin', 'Administration des commissions'],
  ['Platform fee', 'Frais de plateforme'],
  ['Payment providers', 'Prestataires de paiement'],
  ['Provider', 'Prestataire'],
  ['Providers', 'Prestataires'],
  ['Status', 'Statut'],
  ['Created', 'Créé'],
  ['Actions', 'Actions'],
  ['Details', 'Détails'],
  ['Edit', 'Modifier'],
  ['Delete', 'Supprimer'],
  ['Enable', 'Activer'],
  ['Disable', 'Désactiver'],
  ['Check', 'Vérifier'],
  ['Save', 'Enregistrer'],
  ['Save changes', 'Enregistrer les modifications'],
  ['Cancel', 'Annuler'],
  ['Close', 'Fermer'],
  ['School', 'École'],
  ['Parent', 'Parent'],
  ['Student', 'Élève'],
  ['Date of birth', 'Date de naissance'],
  ['Email', 'E-mail'],
  ['Phone number', 'Numéro de téléphone'],
  ['Country code', 'Indicatif pays'],
  ['First name', 'Prénom'],
  ['Last name', 'Nom'],
  ['Description', 'Description'],
  ['Type', 'Type'],
  ['Message', 'Message'],
  ['Title', 'Titre'],
  ['Notes', 'Notes'],
  ['Active', 'Actif'],
  ['Inactive', 'Inactif'],
  ['Yes', 'Oui'],
  ['No', 'Non'],
  ['Reminder', 'Rappel'],
  ['Marketing', 'Marketing'],
  ['Announcement', 'Annonce'],
  ['General', 'Général'],
  ['Payment', 'Paiement'],
  ['Alert', 'Alerte'],
  ['Pending', 'En attente'],
  ['Approved', 'Approuvé'],
  ['Rejected', 'Rejeté'],
  ['Fulfilled', 'Livré'],
  ['Cancelled', 'Annulé'],
  ['Resolved', 'Résolu'],
  ['InProgress', 'En cours'],
  ['Stall', 'Bloqué'],
  ['All statuses', 'Tous les statuts'],
  ['All school users', 'Tous les utilisateurs de l’école'],
  ['Parents only', 'Parents uniquement'],
  ['Collecting agents only', 'Agents collecteurs uniquement'],
  ['Custom list', 'Liste personnalisée'],
  ['Schedule for later', 'Planifier pour plus tard'],
  ['Send now', 'Envoyer maintenant'],
  ['Director Workspace', 'Espace directeur'],
  ['Quick actions', 'Actions rapides'],
  ['Director scope', 'Portée directeur'],
  ['School scope', 'Portée école'],
  ['Status filter', 'Filtre de statut'],
  ['Select a school', 'Sélectionner une école'],
  ['Select a payment status', 'Sélectionner un statut de paiement'],
  ['Transaction ID', 'ID de transaction'],
  ['Pending review', 'En attente de revue'],
  ['Processed school fees', 'Frais scolaires traités'],
  ['Processed merchandise', 'Articles traités'],
  ['Visible transactions', 'Transactions visibles'],
  ['Agent handled', 'Pris en charge par un agent'],
  ['School-wide payment coverage', 'Couverture des paiements de l’école'],
  ['Transaction status lookup', 'Vérification du statut d’une transaction'],
  ['Parents in scope', 'Parents concernés'],
  ['Parents scanned', 'Parents analysés'],
  ['School fee fetch errors', 'Erreurs de chargement des frais scolaires'],
  ['Merch fetch errors', 'Erreurs de chargement des articles'],
  ['Loyalty', 'Fidélité'],
  ['Programme', 'Programme'],
  ['Rules', 'Règles'],
  ['Rewards', 'Récompenses'],
  ['Members', 'Membres'],
  ['Redemptions', 'Échanges'],
  ['Membres fidelite', 'Membres fidélité'],
  ['Regles fidelite', 'Règles fidélité'],
  ['Recompenses fidelite', 'Récompenses fidélité'],
  ['Redemptions fidelite', 'Échanges fidélité'],
  ['Fidelite', 'Fidélité'],
  ['Programmeme fidelite', 'Programme de fidélité'],
  ['No parent linked', 'Aucun parent lié'],
  ['No notes', 'Aucune note'],
  ['Add school', 'Ajouter une école'],
  ['Add parent', 'Ajouter un parent'],
  ['Add director', 'Ajouter un directeur'],
  ['Add child', 'Ajouter un enfant'],
  ['Add agent', 'Ajouter un agent'],
  ['Add merchandise', 'Ajouter un article'],
  ['Add category', 'Ajouter une catégorie'],
  ['Add reward', 'Ajouter une récompense'],
  ['Add rule', 'Ajouter une règle'],
  ['Add provider', 'Ajouter un prestataire'],
  ['Update status', 'Mettre à jour le statut'],
  ['Current program state', 'État actuel du programme'],
  ['Points label', 'Libellé des points'],
  ['Welcome bonus', 'Bonus de bienvenue'],
  ['Minimum redeem points', 'Points minimum pour échange'],
  ['Start date', 'Date de début'],
  ['End date', 'Date de fin'],
  ['Terms and conditions', 'Conditions générales'],
  ['Auto-approve redemptions', 'Approuver automatiquement les échanges'],
  ['Allow parent participation', 'Autoriser la participation des parents'],
  ['Allow agent participation', 'Autoriser la participation des agents'],
  ['Current platform fee', 'Frais de plateforme actuel'],
  ['Active platform fee', 'Frais de plateforme actif'],
  ['Provider commission list', 'Liste des commissions des prestataires'],
  ['No active platform fee', 'Aucun frais de plateforme actif'],
  ['No active program', 'Aucun programme actif'],
  ['Profile updated successfully.', 'Profil mis à jour avec succès.'],
  ['Support request status updated successfully.', 'Le statut de la demande de support a été mis à jour avec succès.'],
  ['Points adjustment saved.', 'Ajustement de points enregistré.'],
  ['Redemption updated.', 'Échange mis à jour.'],
  ['Rule updated.', 'Règle mise à jour.'],
  ['Rule created.', 'Règle créée.'],
  ['Reward updated.', 'Récompense mise à jour.'],
  ['Reward created.', 'Récompense créée.'],
  ['Member enrolled in the loyalty program.', 'Membre inscrit au programme de fidélité.'],
  ['Aucune ecole affectee', 'Aucune école affectée'],
  ['Acces directeur requis', 'Accès directeur requis'],
  ['Aucun programme fidelite', 'Aucun programme de fidélité'],
  ['Aucune activite de recompense', 'Aucune activité de récompense'],
  ['Creez d abord le programme', 'Créez d’abord le programme'],
  ['Aucun membre fidelite trouve', 'Aucun membre fidélité trouvé'],
  ['Aucune recompense fidelite trouvee', 'Aucune récompense fidélité trouvée'],
  ['Aucune ecole affectee', 'Aucune école affectée'],
  ['No date', 'Aucune date'],
  ['Unknown', 'Inconnu'],
  ['Session expired!', 'Session expirée !'],
  ['Internal Server Error!', 'Erreur interne du serveur !'],
  ['Content not modified!', 'Contenu inchangé !'],
  ['Forbidden', 'Interdit'],
  ['Page not found', 'Page introuvable'],
  ['School unavailable', 'École indisponible'],
  ['School command center', 'Centre de pilotage de l’école'],
  ['Classes', 'Classes'],
  ['Support queue', 'File de support'],
  ['Quick actions', 'Actions rapides'],
  ['Director workspace only', 'Espace réservé au directeur'],
  ['No school assigned', 'Aucune école affectée'],
  ['Director-designed rewards programs for parents and collecting agents.', 'Programmes de récompenses conçus par le directeur pour les parents et les agents collecteurs.'],
  ['Platform commission and payment provider settings.', 'Paramètres des commissions de plateforme et des prestataires de paiement.'],
  ['Manage EduFrais platform fees and payment-provider commissions.', 'Gérez les frais de plateforme EduFrais et les commissions des prestataires de paiement.'],
  ['Manage your profile, password, and in-app notifications.', 'Gérez votre profil, votre mot de passe et les notifications de l’application.'],
  ['Director-operated support oversight workspace.', 'Espace de suivi du support géré par le directeur.'],
  ['Director workspace only', 'Espace réservé au directeur'],
])

const fragmentTranslations: Array<[string, string]> = [
  ['updated successfully.', 'mis à jour avec succès.'],
  ['created successfully.', 'créé avec succès.'],
  ['deleted successfully.', 'supprimé avec succès.'],
  ['Director review', 'validation du directeur'],
  ['Auto-approved', 'approbation automatique'],
  ['Current live balance across every loyalty member.', 'Solde actuel cumulé sur tous les membres fidélité.'],
  ['All earned and manually credited points issued so far.', 'Tous les points gagnés et crédités manuellement jusqu’à présent.'],
  ['Points consumed through successful redemptions and debits.', 'Points consommés via les échanges réussis et les débits.'],
  ['Requests waiting for director approval or fulfillment.', 'Demandes en attente d’approbation du directeur ou de traitement.'],
  ['Current school loyalty configuration returned by', 'Configuration actuelle du programme de fidélité renvoyée par'],
  ['Create the first school loyalty program to start earning and redeeming points.', 'Créez le premier programme de fidélité de l’école pour commencer à gagner et échanger des points.'],
  ['No program description yet.', 'Aucune description du programme pour le moment.'],
  ['Current school state', 'État actuel de l’école'],
  ['Configured grade sections', 'Sections de classe configurées'],
  ['Recent support items', 'Éléments récents du support'],
  ['Reward requests currently waiting for a decision.', 'Demandes de récompense actuellement en attente de décision.'],
  ['Requests that are approved and ready for fulfillment.', 'Demandes approuvées et prêtes à être traitées.'],
  ['Reward claims that have already been completed.', 'Demandes de récompense déjà finalisées.'],
  ['Reward requests from parents and collecting agents, then move approved claims through fulfillment.', 'Traitez les demandes de récompense des parents et des agents collecteurs, puis faites avancer les demandes approuvées jusqu’à leur exécution.'],
  ['This page aggregates per-parent payment histories because the backend does not yet expose a single school-level history endpoint.', 'Cette page agrège les historiques de paiement par parent car le backend n’expose pas encore un endpoint unique d’historique au niveau de l’école.'],
  ['Payment history is aggregated school-wide by collecting each parent\'s transaction history behind the scenes.', 'L’historique des paiements est agrégé à l’échelle de l’école en collectant en arrière-plan l’historique des transactions de chaque parent.'],
  ['Monitor school fee and merchandise payment history with a shared status filter and direct transaction lookup.', 'Suivez l’historique des paiements des frais scolaires et des articles avec un filtre de statut commun et une vérification directe des transactions.'],
  ['Collected installment payments with status Processed.', 'Paiements d’échéances collectés avec le statut Traité.'],
  ['Collected merchandise payments with status Processed.', 'Paiements d’articles collectés avec le statut Traité.'],
  ['This support queue is tailored for directors handling family and collecting-agent requests within their own school.', 'Cette file de support est adaptée aux directeurs qui gèrent les demandes des familles et des agents collecteurs dans leur propre école.'],
  ['The current director account is not linked to a school, so support requests cannot be loaded yet.', 'Le compte directeur actuel n’est lié à aucune école, les demandes de support ne peuvent donc pas encore être chargées.'],
  ['Review parent and collecting-agent issues, follow the status timeline, and move requests through resolution.', 'Examinez les problèmes des parents et des agents collecteurs, suivez l’évolution des statuts et faites avancer les demandes jusqu’à leur résolution.'],
  ['Manage your profile, password, and in-app notifications.', 'Gérez votre profil, votre mot de passe et les notifications de l’application.'],
  ['Profile editing is currently wired for director accounts linked to a school.', 'La modification du profil est actuellement disponible pour les comptes directeur liés à une école.'],
  ['The current director profile could not be loaded from the backend.', 'Le profil actuel du directeur n’a pas pu être chargé depuis le backend.'],
  ['This email is used for account communication and password reset by OTP.', 'Cet e-mail est utilisé pour les communications du compte et la réinitialisation du mot de passe par OTP.'],
  ['This number is also used when resetting the password through WhatsApp OTP.', 'Ce numéro est aussi utilisé lors de la réinitialisation du mot de passe via OTP WhatsApp.'],
  ['Queue the notification for a specific date and time.', 'Planifiez la notification pour une date et une heure précises.'],
  ['Dispatch the notification immediately.', 'Envoyez la notification immédiatement.'],
  ['Notify every enabled parent and collecting agent in the school.', 'Notifier tous les parents et agents collecteurs actifs de l’école.'],
  ['Target enabled parent accounts for reminders or announcements.', 'Cibler les comptes parents actifs pour des rappels ou annonces.'],
  ['Reach the field collection team with operational updates.', 'Informer l’équipe terrain de collecte avec des mises à jour opérationnelles.'],
  ['Pick the exact parent and agent accounts that should receive it.', 'Choisir précisément les comptes parents et agents qui doivent la recevoir.'],
  ['School updated successfully.', 'École mise à jour avec succès.'],
  ['School created successfully.', 'École créée avec succès.'],
  ['School deleted successfully.', 'École supprimée avec succès.'],
  ['Payment providers', 'Prestataires de paiement'],
  ['Current active EduFrais platform fee.', 'Frais de plateforme EduFrais actif.'],
  ['Total providers configured in the commission table.', 'Nombre total de prestataires configurés dans la table des commissions.'],
  ['Providers currently enabled for payment fee rules.', 'Prestataires actuellement activés pour les règles de frais de paiement.'],
  ['Average fee percentage across active providers.', 'Pourcentage moyen de frais sur les prestataires actifs.'],
  ['Updating the platform fee creates a new active row and keeps old rates for history.', 'La mise à jour des frais de plateforme crée une nouvelle ligne active et conserve l’historique des anciens taux.'],
  ['Create a platform fee to start tracking EduFrais commission revenue.', 'Créez des frais de plateforme pour commencer à suivre les revenus de commission EduFrais.'],
  ['Snapshot of every payment provider returned by', 'Aperçu de chaque prestataire de paiement renvoyé par'],
  ['Add providers such as Airtel or MTN to start managing provider commission rates.', 'Ajoutez des prestataires comme Airtel ou MTN pour commencer à gérer leurs taux de commission.'],
  ['Monitor families, fees, class structure, field agents, and support operations for your school.', 'Suivez les familles, les frais, la structure des classes, les agents terrain et le support de votre école.'],
  ['School fee payment processed', 'Paiement des frais scolaires traité'],
  ['Merchandise payment processed', 'Paiement d’article traité'],
  ['Agent collection processed', 'Encaissement agent traité'],
  ['Manual enrollment bonus', 'Bonus d’inscription manuelle'],
  ['Manual adjustment', 'Ajustement manuel'],
  ['No recurring cap', 'Aucune limite récurrente'],
  ['Program lifetime', 'Durée du programme'],
  ['Merchandise reward', 'Récompense article'],
  ['School fee credit', 'Crédit frais scolaires'],
  ['Custom benefit', 'Avantage personnalisé'],
  ['Collecting agents:', 'Agents collecteurs :'],
  ['Parents:', 'Parents :'],
  ['Redemptions:', 'Échanges :'],
  ['Reward', 'Récompense'],
  ['Redemptions', 'Échanges'],
  ['Pending review', 'En attente de revue'],
  ['Needs director approval', 'Nécessite l’approbation du directeur'],
  ['Reward options available to this school program.', 'Récompenses disponibles pour ce programme d’école.'],
  ['Reward requests currently waiting for a decision.', 'Demandes de récompense actuellement en attente de décision.'],
  ['Reward claims that have already been completed.', 'Demandes de récompense déjà finalisées.'],
  ['Top redeemed rewards', 'Récompenses les plus échangées'],
  ['Highest-traffic rewards based on the loyalty redemption history.', 'Récompenses les plus demandées selon l’historique des échanges fidélité.'],
  ['Reward claims', 'Demandes de récompense'],
  ['Support request', 'Demande de support'],
  ['School-wide', 'À l’échelle de l’école'],
  ['No contact details', 'Aucun contact'],
  ['Enable notifications', 'Activer les notifications'],
  ['Forgot password', 'Mot de passe oublié'],
]

const regexTranslations = [
  {
    pattern: /^Created (.+) and last updated (.+)\.$/u,
    replace: (_match: string, created: string, updated: string) =>
      `Créé le ${created} et mis à jour le ${updated}.`,
  },
  {
    pattern: /^Created (.+)$/u,
    replace: (_match: string, created: string) => `Créé le ${created}`,
  },
  {
    pattern: /^Starts (.+)$/u,
    replace: (_match: string, value: string) => `Débute le ${value}`,
  },
  {
    pattern: /^Ends (.+)$/u,
    replace: (_match: string, value: string) => `Se termine le ${value}`,
  },
  {
    pattern: /^Combined school fee and merchandise history for (.+)\.$/u,
    replace: (_match: string, value: string) =>
      `Historique combiné des frais scolaires et des articles pour ${value}.`,
  },
  {
    pattern: /^Transactions handled by collecting agents for (.+)\.$/u,
    replace: (_match: string, value: string) =>
      `Transactions prises en charge par les agents collecteurs pour ${value}.`,
  },
  {
    pattern: /^Points label: (.+)$/u,
    replace: (_match: string, value: string) => `Libellé des points : ${value}`,
  },
  {
    pattern: /^Welcome bonus: (.+)$/u,
    replace: (_match: string, value: string) => `Bonus de bienvenue : ${value}`,
  },
  {
    pattern: /^Minimum redeem points: (.+)$/u,
    replace: (_match: string, value: string) =>
      `Points minimum pour échange : ${value}`,
  },
  {
    pattern: /^Auto-approve redemptions: (Yes|No)$/u,
    replace: (_match: string, value: string) =>
      `Approbation automatique des échanges : ${value === 'Yes' ? 'Oui' : 'Non'}`,
  },
  {
    pattern: /^Parent participation: (Enabled|Disabled)$/u,
    replace: (_match: string, value: string) =>
      `Participation des parents : ${value === 'Enabled' ? 'Activée' : 'Désactivée'}`,
  },
  {
    pattern: /^Agent participation: (Enabled|Disabled)$/u,
    replace: (_match: string, value: string) =>
      `Participation des agents : ${value === 'Enabled' ? 'Activée' : 'Désactivée'}`,
  },
  {
    pattern: /^Status (\d+)$/u,
    replace: (_match: string, value: string) => `Statut ${value}`,
  },
]

const translatableAttributes = ['placeholder', 'title', 'aria-label', 'alt'] as const
const ignoredTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA'])

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function preserveWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/u)?.[0] ?? ''
  const trailing = original.match(/\s*$/u)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function translateValue(value: string): string {
  if (!value) {
    return value
  }

  const exact = exactTranslations.get(value)
  if (exact) {
    return exact
  }

  for (const rule of regexTranslations) {
    if (rule.pattern.test(value)) {
      return value.replace(rule.pattern, rule.replace)
    }
  }

  let translated = value
  for (const [from, to] of fragmentTranslations) {
    if (translated.includes(from)) {
      translated = translated.split(from).join(to)
    }
  }

  return translated
}

function shouldIgnoreElement(element: Element | null): boolean {
  if (!element) {
    return true
  }

  if (element.closest('[data-no-fr-translate="true"]')) {
    return true
  }

  return ignoredTags.has(element.tagName)
}

function translateTextNode(node: Text): void {
  const parent = node.parentElement
  if (shouldIgnoreElement(parent)) {
    return
  }

  const original = node.textContent ?? ''
  const normalized = normalizeText(original)
  if (!normalized) {
    return
  }

  const translated = translateValue(normalized)
  if (translated !== normalized) {
    node.textContent = preserveWhitespace(original, translated)
  }
}

function translateElementAttributes(element: Element): void {
  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute)
    if (!value) {
      continue
    }

    const translated = translateValue(value)
    if (translated !== value) {
      element.setAttribute(attribute, translated)
    }
  }
}

function translateNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text)
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return
  }

  const element = node as Element
  if (shouldIgnoreElement(element)) {
    return
  }

  translateElementAttributes(element)

  for (const child of Array.from(element.childNodes)) {
    translateNode(child)
  }
}

export function FrenchLocalization() {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.lang = 'fr'
    const root = document.body
    translateNode(root)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const addedNode of Array.from(mutation.addedNodes)) {
            translateNode(addedNode)
          }
          continue
        }

        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text)
          continue
        }

        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          translateElementAttributes(mutation.target as Element)
        }
      }
    })

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatableAttributes],
    })

    return () => observer.disconnect()
  }, [])

  return null
}
