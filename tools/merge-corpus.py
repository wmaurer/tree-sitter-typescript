import re, subprocess, sys

HEADER = re.compile(r'^(={3,})\n(.+?)\n((?::[^\n]*\n)*)\1\n', re.M)

def entries(text):
    starts = [m.start() for m in HEADER.finditer(text)]
    prelude = text[:starts[0]] if starts else text
    out = {}
    order = []
    for a, b in zip(starts, starts[1:] + [len(text)]):
        chunk = text[a:b].rstrip('\n') + '\n'
        name = HEADER.match(chunk).group(2).strip()
        assert name not in out, f'duplicate entry {name!r}'
        out[name] = chunk
        order.append(name)
    return prelude, order, out

def show(ref, path):
    return subprocess.run(['git', 'show', f'{ref}:{path}'], capture_output=True, text=True, check=True).stdout

base_ref, ours_ref, theirs_ref, path = sys.argv[1:]
_, _, base = entries(show(base_ref, path))
prelude, ours_order, ours = entries(show(ours_ref, path))
_, theirs_order, theirs = entries(show(theirs_ref, path))

result = dict(ours)
for name in theirs_order:
    if name not in base:
        assert name not in ours, f'both sides added {name!r}'
        ours_order.append(name)
        result[name] = theirs[name]
    elif theirs[name] != base[name]:
        assert ours.get(name) == base[name], f'both sides changed {name!r}'
        result[name] = theirs[name]
        print(f'{path}: took branch edit of {name!r}')
for name in base:
    assert name in theirs, f'branch deleted {name!r}'

open(path, 'w').write(prelude + '\n'.join(result[n] for n in ours_order))
print(f'{path}: {len(ours_order)} entries')
