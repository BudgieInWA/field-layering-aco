import matplotlib.pyplot as plot
import json

def main(script, fn, *args):
    with open(fn, 'r') as f:
        stats = json.loads(f.read())

        for key in stats:
            plot.figure(key)
            plot.title(key)
            plot.plot(range(len(stats[key])), stats[key])

        plot.show()

if __name__ == '__main__':
    import sys
    main(*sys.argv)
            
