import { validateUser } from "../app/users.js";
import { withLoadingOverlay } from "../utilities/utility.js";

export function showAdminReturnDialog(onConfirm) {
  const existingDialog = document.querySelector("dialog.admin-return-dialog");
  if (existingDialog) {
    existingDialog.focus();
    return;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "admin-return-dialog";
  dialog.innerHTML = `
    <form class="admin-return-dialog-panel">
      <h2>Admin Verification</h2>
      <p>Enter the admin password to return to the main menu.</p>

      <label class="admin-return-field">
        <span>Admin Password</span>
        <input
          type="password"
          name="password"
          autocomplete="current-password"
          required
        >
      </label>

      <p class="admin-return-error" aria-live="polite"></p>

      <div class="dialog-actions">
        <button type="button" class="cancel-btn">Cancel</button>
        <button type="submit" class="confirm-btn">Continue</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  dialog.showModal();

  const cleanup = () => {
    dialog.remove();
  };

  dialog.addEventListener("close", cleanup, { once: true });

  const form = dialog.querySelector(".admin-return-dialog-panel");
  const passwordInput = dialog.querySelector('input[name="password"]');
  const errorText = dialog.querySelector(".admin-return-error");
  const cancelBtn = dialog.querySelector(".cancel-btn");

  const closeDialog = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  cancelBtn.addEventListener("click", closeDialog);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorText.textContent = "";

    const password = passwordInput.value.trim();
    if (!password) {
      errorText.textContent = "Admin password is required.";
      return;
    }

    await withLoadingOverlay("Verifying admin", async () => {
      const user = await validateUser("admin", password);

      if (!user || user.role !== "admin") {
        errorText.textContent = "Invalid admin password.";
        return;
      }

      closeDialog();
      onConfirm?.();
    });
  });

  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog();
  });

  passwordInput.focus();
}
