/**
 * Brazilian CPF (Cadastro de Pessoa Física) validation utility
 * Validates format, calculates verification digits, and checks for common invalid patterns
 */
class CPFValidator {
  
  /**
   * Clean CPF by removing all non-numeric characters
   * @param {string} cpf - The CPF string to clean
   * @returns {string} - Clean numeric CPF string
   */
  clean(cpf) {
    if (!cpf || typeof cpf !== 'string') {
      return '';
    }
    return cpf.replace(/\D/g, '');
  }

  /**
   * Format CPF with standard Brazilian formatting (XXX.XXX.XXX-XX)
   * @param {string} cpf - The CPF string to format
   * @returns {string} - Formatted CPF string
   */
  format(cpf) {
    const cleanCpf = this.clean(cpf);
    if (cleanCpf.length !== 11) {
      return cleanCpf;
    }
    
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Check if CPF has valid length and basic format
   * @param {string} cpf - The CPF to validate format
   * @returns {boolean} - Whether the format is valid
   */
  hasValidFormat(cpf) {
    const cleanCpf = this.clean(cpf);
    
    // Must have exactly 11 digits
    if (cleanCpf.length !== 11) {
      return false;
    }
    
    // Cannot be all the same digit (like 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate CPF verification digit
   * @param {string} cpf - First 9 or 10 digits of CPF
   * @param {number} weight - Starting weight (10 for first digit, 11 for second)
   * @returns {number} - The calculated verification digit
   */
  calculateDigit(cpf, weight) {
    let sum = 0;
    
    for (let i = 0; i < cpf.length; i++) {
      sum += parseInt(cpf.charAt(i)) * weight;
      weight--;
    }
    
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  /**
   * Validate CPF using Brazilian algorithm
   * @param {string} cpf - The CPF to validate
   * @returns {boolean} - Whether the CPF is valid
   */
  isValid(cpf) {
    const cleanCpf = this.clean(cpf);
    
    // Check basic format first
    if (!this.hasValidFormat(cleanCpf)) {
      return false;
    }
    
    // Calculate first verification digit
    const firstNineDigits = cleanCpf.substring(0, 9);
    const firstDigit = this.calculateDigit(firstNineDigits, 10);
    
    if (firstDigit !== parseInt(cleanCpf.charAt(9))) {
      return false;
    }
    
    // Calculate second verification digit
    const firstTenDigits = cleanCpf.substring(0, 10);
    const secondDigit = this.calculateDigit(firstTenDigits, 11);
    
    if (secondDigit !== parseInt(cleanCpf.charAt(10))) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate and return formatted CPF if valid
   * @param {string} cpf - The CPF to validate and format
   * @returns {Object} - Object with isValid, formatted, and clean properties
   */
  validateAndFormat(cpf) {
    const cleanCpf = this.clean(cpf);
    const isValid = this.isValid(cleanCpf);
    
    return {
      isValid,
      clean: cleanCpf,
      formatted: isValid ? this.format(cleanCpf) : cpf,
      error: isValid ? null : this.getValidationError(cpf)
    };
  }

  /**
   * Get specific validation error message
   * @param {string} cpf - The CPF that failed validation
   * @returns {string} - Specific error message
   */
  getValidationError(cpf) {
    const cleanCpf = this.clean(cpf);
    
    if (!cpf || cleanCpf.length === 0) {
      return 'CPF é obrigatório';
    }
    
    if (cleanCpf.length !== 11) {
      return 'CPF deve ter 11 dígitos';
    }
    
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return 'CPF não pode ter todos os dígitos iguais';
    }
    
    // If we get here, it's a digit verification failure
    return 'CPF inválido';
  }

  /**
   * Generate a random valid CPF for testing purposes
   * @returns {string} - A valid formatted CPF
   */
  generateRandom() {
    // Generate first 9 random digits
    let cpf = '';
    for (let i = 0; i < 9; i++) {
      cpf += Math.floor(Math.random() * 10).toString();
    }
    
    // Calculate and append verification digits
    const firstDigit = this.calculateDigit(cpf, 10);
    cpf += firstDigit.toString();
    
    const secondDigit = this.calculateDigit(cpf, 11);
    cpf += secondDigit.toString();
    
    return this.format(cpf);
  }

  /**
   * Mask CPF for display purposes (show only last 4 digits)
   * @param {string} cpf - The CPF to mask
   * @returns {string} - Masked CPF (XXX.XXX.XXX-12)
   */
  mask(cpf) {
    const cleanCpf = this.clean(cpf);
    if (cleanCpf.length !== 11) {
      return cpf;
    }
    
    const lastFour = cleanCpf.substring(7);
    return `***.***.*${lastFour.substring(0, 2)}-${lastFour.substring(2)}`;
  }
}

// Export singleton instance
module.exports = new CPFValidator();