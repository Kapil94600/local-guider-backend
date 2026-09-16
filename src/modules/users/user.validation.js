export const validateChangePassword = (
  body
) => {
  const {
    currentPassword,
    newPassword,
  } = body;

  if (
    !currentPassword ||
    !newPassword
  ) {
    throw new Error(
      "Current password and new password are required"
    );
  }

  if (newPassword.length < 6) {
    throw new Error(
      "New password must be at least 6 characters"
    );
  }
};