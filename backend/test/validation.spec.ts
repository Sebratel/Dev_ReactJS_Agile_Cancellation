import { ValidationPipe } from '@nestjs/common';
import {
  createGlobalValidationPipe,
  getValidationPipeOptions,
} from '@/common/validation/validation-pipe.config';

describe('Validation pipe', () => {
  it('esta configurado com defaults exigidos', () => {
    const options = getValidationPipeOptions();

    expect(options.whitelist).toBe(true);
    expect(options.forbidNonWhitelisted).toBe(true);
    expect(options.transform).toBe(true);
  });

  it('cria uma instancia de ValidationPipe', () => {
    const pipe = createGlobalValidationPipe();

    expect(pipe).toBeInstanceOf(ValidationPipe);
  });
});
