export class AppError extends Error {
  constructor(status, code, message, fields = null) {
    super(message);

    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
