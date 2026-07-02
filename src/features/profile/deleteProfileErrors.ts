const DELETE_PROFILE_ERROR_MESSAGES: Record<string, string> = {
  USER_HAS_DEPENDENCIES:
    "Não foi possível excluir sua conta porque existem vendas, comissões ou vínculos de equipe associados. Entre em contato com o administrador.",
  COGNITO_DELETE_FAILED:
    "Não foi possível concluir a exclusão da conta. Tente novamente em alguns instantes.",
  FORBIDDEN: "Você não tem permissão para excluir este perfil.",
  USER_NOT_FOUND: "Usuário não encontrado.",
  DELETE_PROFILE_FAILED: "Não foi possível excluir a conta. Tente novamente.",
};

export function getDeleteProfileErrorMessage(error: unknown, isOwnProfile: boolean): string {
  const code = error instanceof Error ? error.message : "DELETE_PROFILE_FAILED";
  const message = DELETE_PROFILE_ERROR_MESSAGES[code];

  if (message) {
    if (code === "USER_HAS_DEPENDENCIES" && !isOwnProfile) {
      return "Não foi possível excluir este usuário porque existem vendas, comissões ou vínculos de equipe associados.";
    }

    return message;
  }

  return "Não foi possível excluir a conta. Tente novamente.";
}
