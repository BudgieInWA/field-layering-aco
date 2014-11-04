import matplotlib.pyplot as plot
import json

def main(script, fn, prefix='saved', *args):
    with open(fn, 'r') as f:
        stats = json.loads(f.read())

        for key in stats:
            plot.figure(prefix + " " + key)
            plot.title(prefix + " " + key)
            plot.plot(range(len(stats[key])), stats[key])

            plot.savefig(prefix+"-"+fn+"-"+key+".png")


        plot.show()

if __name__ == '__main__':
    import sys
    main(*sys.argv)
            
