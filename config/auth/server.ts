import { i18n } from "@better-auth/i18n";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { emailConfig } from "@/config/email";
import { projectConfig } from "@/config/project";
import { db } from "@/db";
import { user as userDb } from "@/db/schemas";
import { env } from "@/env";
import { sendMagicLinkEmail } from "@/features/auth/emails/senders";
import { isWhitelisted } from "@/lib/restrictions";
import { urlConfig } from "../url";

const authServerConfig = {
  appName: projectConfig.name,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    changeEmail: {
      enabled: true,
    },
    additionalFields: {
      theme: {
        type: "string",
        required: true,
        defaultValue: "light",
        input: true,
      },
      lastConnectionAt: {
        type: "date",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => {
        return crypto.randomUUID();
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, _) => {
          if (!env.AUTH_ALLOW_REGISTRATION) {
            throw new APIError("FORBIDDEN", {
              message: "Registration is disabled.",
            });
          }
          if (!isWhitelisted(user.email)) {
            throw new APIError("BAD_REQUEST", {
              message: "Email address not authorized.",
            });
          }
          return {
            data: {
              ...user,
              role: "admin",
            },
          };
        },
      },
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }, request) => {
        if (!isWhitelisted(email)) {
          throw new APIError("BAD_REQUEST", {
            message: "Email address not authorized.",
          });
        }

        const user = await db.query.user.findFirst({
          where: eq(userDb.email, email),
        });

        if (!user && !env.AUTH_ALLOW_REGISTRATION) {
          throw new APIError("FORBIDDEN", {
            message: "Registration is disabled.",
          });
        }
        const isEmergency =
          //@ts-expect-error
          request?.headers.get("x-emergency-login") === "true" ||
          !emailConfig.isConfigured;

        if (isEmergency) {
          console.log("\n--- EMERGENCY MAGIC LINK ---");
          console.log(`To:   ${email}`);
          console.log(`Link: ${url}`);
          console.log("----------------------------\n");
          return;
        }

        await sendMagicLinkEmail(email, {
          name: user?.firstname || email.split("@")[0],
          magicLink: url,
        });
      },
    }),
    i18n({
      translations: {
        fr: {
          USER_NOT_FOUND: "Utilisateur non trouvé",
          INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe invalide",
          INVALID_PASSWORD: "Mot de passe invalide",
          ACCESS_DENIED: "Accès refusé",
          ACCOUNT_NOT_FOUND: "Compte non trouvé",
          ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY:
            "Les utilisateurs anonymes ne peuvent pas se reconnecter de manière anonyme",
          ASYNC_VALIDATION_NOT_SUPPORTED:
            "La validation asynchrone n'est pas prise en charge",
          AUTHENTICATION_REQUIRED: "Authentification requise",
          AUTHORIZATION_PENDING: "Autorisation en attente",
          BACKUP_CODES_NOT_ENABLED: "Les codes de secours ne sont pas activés",
          BODY_MUST_BE_AN_OBJECT: "Le corps de la requête doit être un objet",
          CALLBACK_URL_REQUIRED: "L'URL de redirection est requise",
          CANNOT_DELETE_A_PRE_DEFINED_ROLE:
            "Impossible de supprimer un rôle prédéfini",
          CHANGE_EMAIL_DISABLED: "La modification de l'email est désactivée",
          COULD_NOT_CREATE_SESSION: "Impossible de créer une session",
          CREDENTIAL_ACCOUNT_NOT_FOUND: "Compte d'identification non trouvé",
          CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
            "Navigation inter-site détectée, connexion bloquée",
          DELETE_ANONYMOUS_USER_DISABLED:
            "La suppression d'un utilisateur anonyme est désactivée",
          DEVICE_CODE_ALREADY_PROCESSED:
            "Le code de l'appareil a déjà été traité",
          DEVICE_CODE_NOT_CLAIMED: "Le code de l'appareil n'a pas été réclamé",
          EMAIL_ALREADY_VERIFIED: "Email déjà vérifié",
          EMAIL_CAN_NOT_BE_UPDATED: "L'email ne peut pas être mis à jour",
          EMAIL_MISMATCH: "L'email ne correspond pas",
          EMAIL_NOT_VERIFIED: "Email non vérifié",
          EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
            "Vérification de l'email requise avant d'accepter ou de refuser une invitation",
          EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION_ACCEPTANCE:
            "Vérification de l'email requise pour accepter une invitation",
          EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION:
            "Vérification de l'email requise pour les invitations",
          EXPIRED_DEVICE_CODE: "Code de l'appareil expiré",
          EXPIRED_USER_CODE: "Code utilisateur expiré",
          FAILED_TO_CREATE_USER: "Échec de la création de l'utilisateur",
          FAILED_TO_CREATE_SESSION: "Échec de la création de la session",
          FAILED_TO_DELETE_ANONYMOUS_USER:
            "Échec de la suppression de l'utilisateur anonyme",
          FAILED_TO_DELETE_ANONYMOUS_USER_SESSIONS:
            "Échec de la suppression des sessions de l'utilisateur anonyme",
          FAILED_TO_GET_SESSION: "Échec de la récupération de la session",
          FAILED_TO_GET_USER_INFO:
            "Échec de la récupération des informations de l'utilisateur",
          FAILED_TO_RETRIEVE_INVITATION:
            "Échec de la récupération de l'invitation",
          FAILED_TO_UNLINK_LAST_ACCOUNT:
            "Échec de la dissociation du dernier compte",
          FAILED_TO_UPDATE_USER: "Échec de la mise à jour de l'utilisateur",
          FIELD_NOT_ALLOWED: "Ce champ n'est pas autorisé",
          ID_TOKEN_NOT_SUPPORTED:
            "Les tokens d'identification ne sont pas pris en charge",
          INVALID_BACKUP_CODE: "Code de secours invalide",
          INVALID_CALLBACK_URL: "URL de redirection invalide",
          INVALID_CODE: "Code invalide",
          INVALID_DEVICE_CODE: "Code de l'appareil invalide",
          INVALID_DEVICE_CODE_STATUS: "Statut du code de l'appareil invalide",
          INVALID_DISPLAY_USERNAME: "Nom d'utilisateur d'affichage invalide",
          INVALID_EMAIL: "Email invalide",
          INVALID_EMAIL_FORMAT: "Format d'email invalide",
          INVALID_ERROR_CALLBACK_URL: "URL de redirection d'erreur invalide",
          INVALID_NEW_USER_CALLBACK_URL:
            "URL de redirection pour les nouveaux utilisateurs invalide",
          INVALID_OAUTH_CONFIG: "Configuration OAuth invalide",
          INVALID_OAUTH_CONFIGURATION: "Configuration OAuth invalide",
          INVALID_ORIGIN: "Origine invalide",
          INVALID_OTP: "OTP invalide",
          INVALID_PHONE_NUMBER: "Numéro de téléphone invalide",
          INVALID_PHONE_NUMBER_OR_PASSWORD:
            "Numéro de téléphone ou mot de passe invalide",
          INVALID_REDIRECT_URL: "URL de redirection invalide",
          INVALID_RESOURCE: "Ressource invalide",
          INVALID_SESSION_TOKEN: "Token de session invalide",
          INVALID_TOKEN: "Token invalide",
          INVALID_TWO_FACTOR_COOKIE:
            "Cookie de double authentification invalide",
          INVALID_USER: "Utilisateur invalide",
          INVALID_USERNAME: "Nom d'utilisateur invalide",
          INVALID_USERNAME_OR_PASSWORD:
            "Nom d'utilisateur ou mot de passe invalide",
          INVALID_USER_CODE: "Code utilisateur invalide",
          INVITATION_LIMIT_REACHED: "Limite d'invitations atteinte",
          INVITATION_NOT_FOUND: "Invitation non trouvée",
          INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION:
            "L'invitant n'est plus membre de l'organisation",
          ISSUER_MISMATCH: "Incompatibilité de l'émetteur",
          ISSUER_MISSING: "Émetteur manquant",
          LINKED_ACCOUNT_ALREADY_EXISTS: "Un compte lié existe déjà",
          MEMBER_NOT_FOUND: "Membre non trouvé",
          METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED:
            "Cette méthode n'est pas autorisée, une session différée est requise",
          MISSING_AC_INSTANCE: "Instance d'AC manquante",
          MISSING_FIELD: "Champ manquant",
          MISSING_OR_NULL_ORIGIN: "Origine manquante ou nulle",
          MISSING_RESPONSE: "Réponse manquante",
          NO_ACTIVE_ORGANIZATION: "Aucune organisation active",
          ORGANIZATION_ALREADY_EXISTS: "L'organisation existe déjà",
          ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
            "Limite de membres de l'organisation atteinte",
          ORGANIZATION_NOT_FOUND: "Organisation non trouvée",
          ORGANIZATION_SLUG_ALREADY_TAKEN:
            "Le slug de l'organisation est déjà pris",
          OTP_EXPIRED: "OTP expiré",
          OTP_HAS_EXPIRED: "OTP a expiré",
          OTP_NOT_ENABLED: "OTP n'est pas activé",
          OTP_NOT_FOUND: "OTP non trouvé",
          PASSWORD_ALREADY_SET: "Mot de passe déjà défini",
          PASSWORD_COMPROMISED: "Mot de passe compromis",
          PASSWORD_TOO_LONG: "Mot de passe trop long",
          PASSWORD_TOO_SHORT: "Mot de passe trop court",
          PHONE_NUMBER_CANNOT_BE_UPDATED:
            "Le numéro de téléphone ne peut pas être mis à jour",
          PHONE_NUMBER_EXISTS: "Le numéro de téléphone existe déjà",
          PHONE_NUMBER_EXIST: "Le numéro de téléphone existe déjà",
          PHONE_NUMBER_NOT_EXIST: "Le numéro de téléphone n'existe pas",
          PHONE_NUMBER_NOT_VERIFIED: "Numéro de téléphone non vérifié",
          POLLING_TOO_FREQUENTLY: "Sondage trop fréquent",
          PROVIDER_CONFIG_NOT_FOUND: "Configuration du fournisseur non trouvée",
          PROVIDER_ID_REQUIRED: "ID du fournisseur requis",
          PROVIDER_NOT_FOUND: "Fournisseur non trouvé",
          ROLE_IS_ASSIGNED_TO_MEMBERS: "Le rôle est attribué à des membres",
          ROLE_NAME_IS_ALREADY_TAKEN: "Le nom du rôle est déjà pris",
          ROLE_NOT_FOUND: "Rôle non trouvé",
          SEND_OTP_NOT_IMPLEMENTED: "L'envoi d'OTP n'est pas implémenté",
          SESSION_EXPIRED: "Session expirée",
          SESSION_NOT_FRESH: "Session non récente",
          SESSION_REQUIRED: "Session requise",
          SOCIAL_ACCOUNT_ALREADY_LINKED: "Compte social déjà lié",
          TEAM_ALREADY_EXISTS: "L'équipe existe déjà",
          TEAM_MEMBER_LIMIT_REACHED: "Limite de membres de l'équipe atteinte",
          TEAM_NOT_FOUND: "Équipe non trouvée",
          TOKEN_EXPIRED: "Token expiré",
          TOKEN_URL_NOT_FOUND: "URL de token non trouvée",
          TOO_MANY_ATTEMPTS: "Trop de tentatives",
          TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
            "Trop de tentatives, demandez un nouveau code",
          TOO_MANY_ROLES: "Trop de rôles",
          TOTP_NOT_ENABLED: "TOTP n'est pas activé",
          TWO_FACTOR_NOT_ENABLED:
            "La double authentification n'est pas activée",
          UNABLE_TO_REMOVE_LAST_TEAM:
            "Impossible de supprimer la dernière équipe",
          UNEXPECTED_ERROR: "Erreur inattendue",
          UNKNOWN_ERROR: "Erreur inconnue",
          USERNAME_IS_ALREADY_TAKEN: "Le nom d'utilisateur est déjà pris",
          USERNAME_TOO_LONG: "Le nom d'utilisateur est trop long",
          USERNAME_TOO_SHORT: "Le nom d'utilisateur est trop court",
          USER_ALREADY_EXISTS: "L'utilisateur existe déjà",
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
            "L'utilisateur existe déjà, utilisez un autre email",
          USER_ALREADY_HAS_PASSWORD: "L'utilisateur a déjà un mot de passe",
          USER_EMAIL_NOT_FOUND: "Email de l'utilisateur non trouvé",
          USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
            "L'utilisateur est déjà membre de cette organisation",
          USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
            "L'utilisateur est déjà invité à cette organisation",
          USER_IS_NOT_ANONYMOUS: "L'utilisateur n'est pas anonyme",
          USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION:
            "L'utilisateur n'est pas membre de l'organisation",
          USER_IS_NOT_A_MEMBER_OF_THE_TEAM:
            "L'utilisateur n'est pas membre de l'équipe",
          VALIDATION_ERROR: "Erreur de validation",
          VERIFICATION_EMAIL_NOT_ENABLED:
            "La vérification par email n'est pas activée",
          VERIFICATION_FAILED: "Échec de la vérification",
          YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à accéder à cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION:
            "Vous n'êtes pas autorisé à annuler cette invitation",
          YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION:
            "Vous n'êtes pas autorisé à créer une nouvelle organisation",
          YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM:
            "Vous n'êtes pas autorisé à créer une nouvelle équipe",
          YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM_MEMBER:
            "Vous n'êtes pas autorisé à créer un nouveau membre d'équipe",
          YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE:
            "Vous n'êtes pas autorisé à créer un rôle",
          YOU_ARE_NOT_ALLOWED_TO_CREATE_TEAMS_IN_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à créer des équipes dans cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_DELETE_A_ROLE:
            "Vous n'êtes pas autorisé à supprimer un rôle",
          YOU_ARE_NOT_ALLOWED_TO_DELETE_TEAMS_IN_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à supprimer des équipes dans cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER:
            "Vous n'êtes pas autorisé à supprimer ce membre",
          YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à supprimer cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_TEAM:
            "Vous n'êtes pas autorisé à supprimer cette équipe",
          YOU_ARE_NOT_ALLOWED_TO_GET_A_ROLE:
            "Vous n'êtes pas autorisé à obtenir un rôle",
          YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à inviter des utilisateurs dans cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE:
            "Vous n'êtes pas autorisé à inviter un utilisateur avec ce rôle",
          YOU_ARE_NOT_ALLOWED_TO_LIST_A_ROLE:
            "Vous n'êtes pas autorisé à lister un rôle",
          YOU_ARE_NOT_ALLOWED_TO_READ_A_ROLE:
            "Vous n'êtes pas autorisé à lire un rôle",
          YOU_ARE_NOT_ALLOWED_TO_REMOVE_A_TEAM_MEMBER:
            "Vous n'êtes pas autorisé à supprimer un membre d'équipe",
          YOU_ARE_NOT_ALLOWED_TO_UPDATE_A_ROLE:
            "Vous n'êtes pas autorisé à mettre à jour un rôle",
          YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER:
            "Vous n'êtes pas autorisé à mettre à jour ce membre",
          YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
            "Vous n'êtes pas autorisé à mettre à jour cette organisation",
          YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_TEAM:
            "Vous n'êtes pas autorisé à mettre à jour cette équipe",
          YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION:
            "Vous n'êtes pas membre de cette organisation",
          YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
            "Vous n'êtes pas le destinataire de l'invitation",
          YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
            "Vous ne pouvez pas quitter l'organisation en tant que seul propriétaire",
          YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
            "Vous ne pouvez pas quitter l'organisation sans un propriétaire",
          YOU_CAN_NOT_ACCESS_THE_MEMBERS_OF_THIS_TEAM:
            "Vous ne pouvez pas accéder aux membres de cette équipe",
          YOU_DO_NOT_HAVE_AN_ACTIVE_TEAM: "Vous n'avez pas d'équipe active",
          YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS:
            "Vous avez atteint le nombre maximum d'organisations",
          YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_TEAMS:
            "Vous avez atteint le nombre maximum d'équipes",
          YOU_MUST_BE_IN_AN_ORGANIZATION_TO_CREATE_A_ROLE:
            "Vous devez être dans une organisation pour créer un rôle",
          FAILED_TO_CREATE_VERIFICATION:
            "Échec de la création de la vérification",
        },
      },
    }),
  ],
  baseURL: env.AUTORIZED_DOMAINS?.[0] || urlConfig.baseUrl,
  trustedOrigins: [
    ...(env.AUTORIZED_DOMAINS || []),
    urlConfig.baseUrl || "http://localhost:3000" || "https://localhost:3000",
  ],
  secret: env.BETTER_AUTH_SECRET,
  experimental: {
    joins: true,
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/magic-link/get-verification-token": {
        window: 10,
        max: 3,
      },
    },
  },
} satisfies Parameters<typeof betterAuth>[0];

export default authServerConfig;
