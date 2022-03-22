'use strict';

(function () {

    class PriorityQueue extends Set {
        pop() {
            let maxPair = [-1, -1];
            for (let pair of this) {
                if (maxPair[0] < pair[0]) {
                    maxPair = pair;
                }
            }

            this.delete(maxPair);

            return maxPair;
        }

        static unify(queue0, queue1) {
            let parent = queue0;
            let child = queue1;
            if (parent.size < child.size) {
                const temp = child;
                child = parent;
                parent = temp;
            }

            for (let pair of child)
                parent.add(pair);

            return parent;
        }
    }

    class Propagation {
        constructor(maximum) {
            this.criticalPoints = [maximum];
            this.parent = this;
            this.queue = new PriorityQueue();
        }

        find() {
            return this.parent === this
                ? this
                : this.parent.find();
        }

        static unify(p0, p1, orderField) {
            let parent = p0.find();
            let child = p1.find();

            if (orderField[p0.criticalPoints[0]] < orderField[p1.criticalPoints[0]]) {
                const temp = parent;
                parent = child;
                child = temp;
            }

            child.parent = parent;

            parent.queue = PriorityQueue.unify(parent.queue, child.queue);

            return parent;
        }
    }

    class PersistencePairs {

        constructor() {

        }

        static computeOrderField(scalars) {
            const nVertices = scalars.length;
            const orderField = new Int16Array(nVertices);

            let indices = [];
            for (let i = 0; i < nVertices; i++)
                indices.push([scalars[i], i]);

            indices.sort((a, b) => {
                return a[0] === b[0]
                    ? a[1] - b[1]
                    : a[0] - b[0];
            });

            for (let i = 0; i < nVertices; i++)
                orderField[indices[i][1]] = i;

            return orderField;
        }

        static computeMaxima(orderField) {
            const nVertices = orderField.length;

            const maxima = [];

            for (let i = 1; i < nVertices - 1; i++) {
                if (orderField[i - 1] < orderField[i] && orderField[i + 1] < orderField[i])
                    maxima.push(i);
            }

            if (orderField.length > 1) {
                if (orderField[0] > orderField[1])
                    maxima.push(0);
                if (orderField[orderField.length - 1] > orderField[orderField.length - 2])
                    maxima.push(orderField.length - 1);
            }

            return maxima;
        }

        static initPropagations(maxima) {
            const propagations = [];

            for (let maximum of maxima) {
                propagations.push(new Propagation(maximum));
            }

            return propagations;
        }

        static computePropagation(propagation, propagationMask, segmentationIds, orderField) {
            const nVertices = orderField.length;
            const nVerticesM1 = nVertices - 1;

            let currentPropagation = propagation;
            let v = currentPropagation.criticalPoints[0];
            let segmentationId = v;

            currentPropagation.queue.add([orderField[v], v]);

            while (currentPropagation.queue.size) {
                v = currentPropagation.queue.pop()[1];

                if (propagationMask[v] !== null)
                    continue;


                const order = orderField[v];

                const neigbors = [];
                if (v > 0)
                    neigbors.push(v - 1);
                if (v < nVerticesM1)
                    neigbors.push(v + 1);

                let isSaddle = false;
                let nLargerNeighborsThisPropagationVisited = 0;

                for (let u of neigbors) {
                    const orderU = orderField[u];
                    if (orderU > order) {
                        const uPropagation = propagationMask[u];
                        if (uPropagation === null || currentPropagation != uPropagation.find())
                            isSaddle = true;
                        else
                            nLargerNeighborsThisPropagationVisited++;
                    } else {
                        currentPropagation.queue.add([orderU, u]);
                    }
                }


                if (isSaddle) {
                    currentPropagation.criticalPoints.push(v);

                    segmentationIds[v] -= nLargerNeighborsThisPropagationVisited;

                    // if this thread did not register the last remaining larger vertices then terminate propagation
                    if (segmentationIds[v] != -3)
                        return 1;

                    // merge propagations
                    for (let u of neigbors) {

                        if (propagationMask[u] !== null) {
                            const uPropagation = propagationMask[u].find();
                            if (uPropagation !== currentPropagation) {
                                currentPropagation = Propagation.unify(
                                    currentPropagation,
                                    uPropagation,
                                    orderField
                                );
                            }
                        }
                    }

                    segmentationId = v;
                }

                // mark vertex as visited and continue
                propagationMask[v] = currentPropagation;
                segmentationIds[v] = segmentationId;
            }

            currentPropagation.criticalPoints.push(v);

            return 1;
        }

        static computeMaximaPairs(scalars) {
            const orderField = PersistencePairs.computeOrderField(scalars);
            const maxima = PersistencePairs.computeMaxima(orderField);
            const propagations = PersistencePairs.initPropagations(maxima);

            const nVertices = orderField.length;
            const propagationMask = [];
            const segmentationIds = new Int16Array(nVertices);
            for (let i = 0; i < nVertices; i++) {
                segmentationIds[i] = -1;
                propagationMask[i] = null;
            }

            for (let propagation of propagations) {
                PersistencePairs.computePropagation(
                    propagation,
                    propagationMask,
                    segmentationIds,
                    orderField
                );
            }

            const pairs = [];
            for (let propagation of propagations) {
                const u = propagation.criticalPoints[0];
                const v = propagation.criticalPoints[propagation.criticalPoints.length - 1];
                const p = scalars[u] - scalars[v];
                pairs.push([u, v, p]);
            }

            pairs.sort((a, b) => b[2] - a[2]);

            return pairs;
        }
    }

    window.TTK = {
        PersistencePairs: PersistencePairs,
        Propagation: Propagation,
        PriorityQueue: PriorityQueue
    };

})();