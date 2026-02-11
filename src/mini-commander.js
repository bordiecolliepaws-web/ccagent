function flagToKey(flag) {
  return flag
    .replace(/^--/, '')
    .split('-')
    .map((part, idx) => (idx === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join('');
}

function parseOptionFlags(flags) {
  const parts = flags.split(',').map((part) => part.trim());
  const long = parts.find((part) => part.startsWith('--'));
  if (!long) {
    throw new Error(`Unsupported option flag format: ${flags}`);
  }

  const takesValue = /<[^>]+>/.test(long);
  const longName = long.split(' ')[0];

  return {
    long: longName,
    key: flagToKey(longName),
    takesValue,
  };
}

export class Command {
  constructor(commandName = '') {
    this._commandName = commandName;
    this._name = commandName || 'program';
    this._description = '';
    this._version = '0.0.0';
    this._commands = [];
    this._argumentSpec = null;
    this._options = [];
    this._action = null;
  }

  name(value) {
    this._name = value;
    return this;
  }

  description(value) {
    this._description = value;
    return this;
  }

  version(value) {
    this._version = value;
    return this;
  }

  command(name) {
    const commandName = name.trim().split(' ')[0];
    const cmd = new Command(commandName);
    this._commands.push(cmd);
    return cmd;
  }

  argument(spec) {
    this._argumentSpec = spec;
    return this;
  }

  option(flags, _description, parserOrDefault, defaultValue) {
    const parsed = parseOptionFlags(flags);

    let parser = null;
    let optionDefault;

    if (typeof parserOrDefault === 'function') {
      parser = parserOrDefault;
      optionDefault = defaultValue;
    } else {
      optionDefault = parserOrDefault;
    }

    this._options.push({
      ...parsed,
      parser,
      defaultValue: optionDefault,
    });

    return this;
  }

  action(handler) {
    this._action = handler;
    return this;
  }

  printHelp() {
    const lines = [];
    lines.push(`${this._name}${this._description ? ` - ${this._description}` : ''}`);

    if (this._commands.length) {
      lines.push('');
      lines.push('Commands:');
      this._commands.forEach((cmd) => {
        const desc = cmd._description ? `  ${cmd._description}` : '';
        lines.push(`  ${cmd._commandName}${desc}`);
      });
    }

    console.log(lines.join('\n'));
  }

  async _execute(args) {
    const options = {};
    this._options.forEach((option) => {
      if (option.defaultValue !== undefined) {
        options[option.key] = option.defaultValue;
      } else if (!option.takesValue) {
        options[option.key] = false;
      }
    });

    const positionals = [];
    for (let i = 0; i < args.length; i += 1) {
      const token = args[i];

      if (token === '--help' || token === '-h') {
        this.printHelp();
        return;
      }

      if (token.startsWith('--')) {
        const option = this._options.find((opt) => opt.long === token);
        if (!option) {
          throw new Error(`Unknown option: ${token}`);
        }

        if (option.takesValue) {
          const next = args[i + 1];
          if (next === undefined || next.startsWith('--')) {
            throw new Error(`Missing value for option ${token}`);
          }
          i += 1;
          options[option.key] = option.parser ? option.parser(next) : next;
        } else {
          options[option.key] = true;
        }
        continue;
      }

      positionals.push(token);
    }

    let argumentValue;
    if (this._argumentSpec) {
      const variadic = this._argumentSpec.includes('...');
      const required = this._argumentSpec.startsWith('<');

      if (variadic) {
        if (required && positionals.length === 0) {
          throw new Error(`Missing required argument ${this._argumentSpec}`);
        }
        argumentValue = positionals;
      } else {
        if (required && positionals.length === 0) {
          throw new Error(`Missing required argument ${this._argumentSpec}`);
        }
        argumentValue = positionals[0];
      }
    }

    if (!this._action) {
      return;
    }

    if (this._argumentSpec) {
      await this._action(argumentValue, options);
      return;
    }

    await this._action(options);
  }

  async parseAsync(argv) {
    const args = argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      this.printHelp();
      return;
    }

    if (args[0] === '--version' || args[0] === '-V') {
      console.log(this._version);
      return;
    }

    const commandName = args[0];
    const subcommand = this._commands.find((cmd) => cmd._commandName === commandName);

    if (!subcommand) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    await subcommand._execute(args.slice(1));
  }
}
