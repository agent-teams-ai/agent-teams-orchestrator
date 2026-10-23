import { createRequire } from 'node:module';
import { arch, platform } from 'node:os';

// This asset adapter accepts no module name or path from callers. All references
// are public, pinned optional distributions of embedded-postgres itself.
export function postgresBinaries(): {postgres: string; pgCtl: string} {
  const requireFromWrapper = createRequire(import.meta.resolve('embedded-postgres'));
  let binaries: unknown;
  switch (`${platform()}-${arch()}`) {
    case 'win32-x64': binaries = requireFromWrapper('@embedded-postgres/windows-x64'); break;
    case 'darwin-arm64': binaries = requireFromWrapper('@embedded-postgres/darwin-arm64'); break;
    case 'darwin-x64': binaries = requireFromWrapper('@embedded-postgres/darwin-x64'); break;
    case 'linux-arm64': binaries = requireFromWrapper('@embedded-postgres/linux-arm64'); break;
    case 'linux-x64': binaries = requireFromWrapper('@embedded-postgres/linux-x64'); break;
    default: throw new Error('Unsupported PostgreSQL research distribution tuple');
  }
  if (typeof binaries !== 'object' || binaries === null || !('pg_ctl' in binaries) || !('postgres' in binaries)
    || typeof binaries.pg_ctl !== 'string' || typeof binaries.postgres !== 'string') {
    throw new Error('PostgreSQL distribution has no public binary paths');
  }
  return { postgres: binaries.postgres, pgCtl: binaries.pg_ctl };
}
