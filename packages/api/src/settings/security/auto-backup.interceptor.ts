import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { BackupService } from '../backup/backup.service';

interface HttpRequest {
  route?: { path?: string };
  method?: string;
}

@Injectable()
export class AutoBackupInterceptor implements NestInterceptor {
  private readonly destructivePatterns: Array<{
    method: string;
    path: RegExp;
  }> = [
    { method: 'POST', path: /\/import$/ },
    { method: 'POST', path: /\/restore$/ },
    { method: 'POST', path: /\/reset$/ },
    { method: 'POST', path: /\/master-password\/change$/ },
  ];

  constructor(private readonly backup: BackupService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const path = request.route?.path ?? '';
    const method = request.method ?? '';

    const isDestructive = this.destructivePatterns.some(
      (p) => method === p.method && p.path.test(path),
    );

    if (isDestructive) {
      const reason = `pre-${path.split('/').pop() ?? 'operation'}`;
      void this.backup.createAutoBackup(reason);
    }

    return next.handle();
  }
}
