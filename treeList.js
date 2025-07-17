function generateMockData() {
    const data = [];
    let idCounter = 1;

    function generateChildren(parentId, depth, count) {
        const children = [];
        for (let i = 0; i < count; i++) {
            const node = {
                id: idCounter++,
                parentId,
                text: `节点 ${idCounter}`,
                children: [],
                expanded: false,
                hasChildren: depth < 4,
                level: depth
            };

            if (depth < 4 && Math.random() > 0.3) {
                node.children = generateChildren(node.id, depth + 1, Math.floor(Math.random() * 8) + 1);
                node.hasChildren = node.children.length > 0;
            }

            children.push(node);
        }
        return children;
    }

    // 生成根节点
    for (let i = 0; i < 20; i++) {
        const rootNode = {
            id: idCounter++,
            parentId: null,
            text: `根节点 ${i + 1}`,
            children: [],
            expanded: false,
            hasChildren: true,
            level: 0
        };

        rootNode.children = generateChildren(rootNode.id, 1, Math.floor(Math.random() * 15) + 5);
        rootNode.hasChildren = rootNode.children.length > 0;
        data.push(rootNode);
    }

    return data;
}

class TreeList {
    constructor(viewportId, data) {
        this.viewport = document.getElementById(viewportId);
        this.scrollContent = document.getElementById('scrollContent');
        this.data = data;
        this.flatData = [];
        this.visibleNodes = [];
        this.itemHeight = 40;
        this.dragState = null;
        this.renderHeight = 0;

        this.flattenData();
        this.initScrollContent()
        this.initViewport();
        this.renderVisibleNodes();
        this.setupEventListeners();
    }
    initScrollContent() {
        this.scrollContent = document.createElement('div');
        this.scrollContent.id = 'scrollContent'
        this.scrollContent.style = 'positions: relative'
        this.viewport.appendChild(this.scrollContent)
    }
    flattenData() {
        this.flatData = [];
        let index = 0;

        const traverse = (nodes, parentId = null, level = 0) => {
            nodes.forEach(node => {
                node.index = index++
                node.visible = level === 0 || (parentId && this.flatData.find(n => n.id === parentId)?.expanded)
                this.flatData.push(node);

                if (node.children && node.expanded) {
                    traverse(node.children, node.id, level + 1);
                }
            });
        };

        traverse(this.data);
    }
    initViewport() {
        this.renderHeight = this.flatData.filter(node => node.visible).length * this.itemHeight;
        this.scrollContent.style.height = `${this.renderHeight}px`
    }

    renderVisibleNodes() {
        const scrollTop = this.viewport.scrollTop;
        const viewportHeight = this.viewport.clientHeight;
        const startIdx = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 5);
        const endIdx = Math.min(
            this.flatData.filter(n => n.visible).length,
            startIdx + Math.ceil(viewportHeight / this.itemHeight) + 10
        );

        const visibleNodes = this.flatData
            .filter(node => node.visible)
            .slice(startIdx, endIdx);


        const fragment = document.createDocumentFragment();

        visibleNodes.forEach(node => {
            let nodeElement = this.scrollContent.querySelector(`[data-id="${node.id}"]`);
            if (!nodeElement) {
                nodeElement = this.createNodeElement(node);
            }

            nodeElement.style.paddingLeft = `${node.level * 24 + 15}px`;
            nodeElement.style.transform = `translateY(${node.index * this.itemHeight}px)`;
            fragment.appendChild(nodeElement);
        });

        const allNodes = this.scrollContent.querySelectorAll('.tree-node');
        allNodes.forEach(node => {
            const nodeId = parseInt(node.dataset.id);
            if (!visibleNodes.some(vn => vn.id === nodeId)) {
                node.remove();
            }
        });

        this.scrollContent.appendChild(fragment);
    }

    createNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'tree-node';
        nodeElement.dataset.id = node.id;
        nodeElement.style.height = `${this.itemHeight}px`;
        nodeElement.style.top = '0';
        nodeElement.style.position = 'absolute';
        nodeElement.style.width = '100%';

        nodeElement.draggable = true;

        nodeElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between">
                        <div class="node-text">${node.text}</div>
                        <div style="display: flex;">
                            <div class="edit-btn">编辑</div>
                            ${node.hasChildren ? `<div class="node-toggle" style="margin-left: 10px">${node.expanded ? '收缩' : '展开'}</div>` : ''}
                        </div>
                    </div>
                `;

        return nodeElement;
    }
    setupEventListeners() {
        this.viewport.addEventListener('scroll', () => {
            this.renderVisibleNodes();
        });
        this.scrollContent.addEventListener('click', this.handleNodeClick.bind(this));
        this.scrollContent.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.scrollContent.addEventListener('dragover', this.handleDragOver.bind(this));
        this.scrollContent.addEventListener('drop', this.handleDrop.bind(this));
        this.scrollContent.addEventListener('dragend', this.handleDragEnd.bind(this));
    }
    handleNodeClick(e) {
        const nodeElement = e.target.closest('.tree-node');
        if (!nodeElement) return;

        const nodeId = parseInt(nodeElement.dataset.id);
        const node = this.flatData.find(n => n.id === nodeId);

        if (e.target.classList.contains('node-toggle')) {
            node.expanded = !node.expanded
            nodeElement.querySelector('.node-toggle').textContent = node.expanded ? '收缩' : '展开'
            this.flattenData()
            this.initViewport();
            this.renderVisibleNodes();
        }
        else if (e.target.classList.contains('edit-btn')) {
            this.editNode(node, nodeElement);
        }
    }
    editNode(node, nodeElement) {
        const textElement = nodeElement.querySelector('.node-text');
        const originalText = textElement.textContent;

        const input = document.createElement('input');
        input.className = 'node-edit';
        input.value = originalText;

        textElement.replaceWith(input);
        input.focus();

        const finishEdit = () => {
            node.text = input.value;
            input.replaceWith(textElement);
            input.removeEventListener('blur', finishEdit)
            textElement.textContent = input.value;
        };

        input.addEventListener('blur', finishEdit);
    }
    handleDragStart(e) {
        const nodeElement = e.target.closest('.tree-node');
        if (!nodeElement) return;

        const nodeId = parseInt(nodeElement.dataset.id);
        this.dragState = {
            nodeId,
            sourceElement: nodeElement
        };
    }
    handleDragOver(e) {
        e.preventDefault();

        const nodeElement = e.target.closest('.tree-node');
        if (!nodeElement || !this.dragState) return;

        const targetId = parseInt(nodeElement.dataset.id);
        this.dragState.targetId = targetId;
    }

    handleDrop(e) {
        e.preventDefault();

        if (!this.dragState || !this.dragState.targetId) return;

        const { nodeId, targetId } = this.dragState;
        if (nodeId === targetId) return;

        this.moveNode(nodeId, targetId);

        this.handleDragEnd()
    }

    handleDragEnd() {
        if (this.dragState) {
            this.dragState = null;
        }
    }


    moveNode(sourceId, targetId) {
        const sourceNode = this.findNodeInTree(sourceId);
        const targetNode = this.findNodeInTree(targetId);

        console.log(sourceNode, targetNode)

        this.removeNodeFromTree(sourceId);

        
        let parent = this.findParent(targetId);
        if (!parent) {
            parent = {
                id: null,
                level: -1,
                children: this.data
            }
        }
     
        sourceNode.parentId = parent.id
        sourceNode.level = parent.level + 1
        function updateLevel(list, level) {
            list.forEach(item => {
                item.level = level + 1
                updateLevel(item.children, item.level)
            })
        }
        updateLevel(sourceNode.children, sourceNode.level)
        const targetIndex = parent.children.findIndex(n => n.id === targetId);
        parent.children.splice(targetIndex + 1, 0, sourceNode);

        this.flattenData();
        this.initViewport();
        this.renderVisibleNodes();
    }

    removeNodeFromTree(nodeId) {
        const removeFromParent = (parent) => {
            if (!parent.children) return;

            const index = parent.children.findIndex(n => n.id === nodeId);
            if (index !== -1) {
                parent.children.splice(index, 1);
                parent.hasChildren = parent.children.length > 0;
                return true;
            }

            for (const child of parent.children) {
                if (removeFromParent(child)) {
                    return true;
                }
            }

            return false;
        };

        const rootIndex = this.data.findIndex(n => n.id === nodeId);
        if (rootIndex !== -1) {
            this.data.splice(rootIndex, 1);
            return;
        }

        for (const root of this.data) {
            if (removeFromParent(root)) {
                return;
            }
        }
    }

    findNodeInTree(nodeId) {
        const find = (nodes) => {
            for (const node of nodes) {
                if (node.id === nodeId) return node;
                if (node.children) {
                    const found = find(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return find(this.data);
    }

    findParent(nodeId) {
        const findParent = (parent, childId) => {
            if (parent.children) {
                for (const child of parent.children) {
                    if (child.id === childId) {
                        return parent;
                    }

                    const found = findParent(child, childId);
                    if (found) return found;
                }
            }
            return null;
        };

        for (const root of this.data) {
            if (root.id === nodeId) return null

            const parent = findParent(root, nodeId);
            if (parent) return parent;
        }

        return null;
    }

}

const mockData = generateMockData();
const tree = new TreeList('treeViewport', mockData);