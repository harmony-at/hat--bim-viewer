import {
    math,
    XKTLoaderPlugin,
  } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
  import { Controller } from "../Controller.js";
  import { ModelsContextMenu } from "../contextMenus/ModelsContextMenu.js";
  
  const tempVec3a = math.vec3();
  
  /**
   * Custom data access strategy for {@link XKTLoaderPlugin}.
   * @private
   */
  class BIMViewerDataSource {
    constructor(server) {
      this._server = server;
    }
  
    setProjectId(projectId) {
      this._projectId = projectId;
    }
  
    setModelId(modelId) {
      this._modelId = modelId;
    }
  
    getManifest(src, ok, error) {
      this._server.getSplitModelManifest(
        this._projectId,
        this._modelId,
        src,
        ok,
        error
      );
    }
  
    getMetaModel(src, ok, error) {
      this._server.getSplitModelMetadata(
        this._projectId,
        this._modelId,
        src,
        ok,
        error
      );
    }
  
    getXKT(src, ok, error) {
      this._server.getSplitModelGeometry(
        this._projectId,
        this._modelId,
        src,
        ok,
        error
      );
    }
  }
  
  /** @private */
  class ModelsExplorer extends Controller {
    constructor(parent, cfg) {
      super(parent, cfg);
  
      if (!cfg.modelsTabElement) {
        throw "Missing config: modelsTabElement";
      }
  
      if (!cfg.unloadModelsButtonElement) {
        throw "Missing config: unloadModelsButtonElement";
      }
  
      if (!cfg.modelsElement) {
        throw "Missing config: modelsElement";
      }
  
      if (!cfg.checkLoadModelsElement) {
          throw 'Missing config: checkLoadModelsElement';
      }
  
      this._enableAddModels = !!cfg.enableEditModels;
      this._modelsTabElement = cfg.modelsTabElement;
      this._loadModelsButtonElement = cfg.loadModelsButtonElement;
      this._unloadModelsButtonElement = cfg.unloadModelsButtonElement;
      this._addModelButtonElement = cfg.addModelButtonElement;
      this._modelsElement = cfg.modelsElement;
      this._checkLoadModelsElement = cfg.checkLoadModelsElement;
      this._modelsTabButtonElement =
        this._modelsTabElement.querySelector(".xeokit-tab-btn");
  
      if (!this._modelsTabButtonElement) {
        throw "Missing DOM element: ,xeokit-tab-btn";
      }
  
      this._dataSource = new BIMViewerDataSource(this.server);
  
      this._xktLoader = new XKTLoaderPlugin(this.viewer, {
        dataSource: this._dataSource,
      });
  
      this._modelsContextMenu = new ModelsContextMenu({
        enableEditModels: cfg.enableEditModels,
        enableMeasurements: cfg.enableMeasurements,
        hideOnAction: true,
      });
  
      this._modelsInfo = {};
      this._numModels = 0;
      this._numModelsLoaded = 0;
      this._projectId = null;
    }
  
    setObjectColors(objectColors) {
      this._xktLoader.objectDefaults = objectColors;
    }
  
    loadProject(models, viewerConfigs, edges, lstModelUncheck, done, error) {
      this.unloadProject();
      this._modelsInfo = {};
      this._numModels = 0;
      this._edges = edges;
  
      this._models = models;
      this._parseProject(models, viewerConfigs);
      this._loadAllModels(models, done, lstModelUncheck);
    }
  
    _loadAllModels(models, done, lstModelUncheck) {
      this._modelsExplorer = models;
      const modelIds = models.map((item) => item.id);
      const uniqueIds = modelIds.filter(id => !lstModelUncheck.includes(id));
  
      this._loadModelsSequentially(uniqueIds, 0, done);
    }
  
    _loadModelsSequentially(modelIds, index, done) {
      if (index >= modelIds.length) {
        // Nếu đã load xong tất cả các model, gọi hàm done
        done();
        return;
      }
  
      const modelId = modelIds[index];
      this.loadModel(
        modelId,
        () => {
          // Sau khi load model thành công, ẩn modal bận rộn
          // this.bimViewer._busyModal.hide();
  
          // Gọi đệ quy để load model tiếp theo
          this._loadModelsSequentially(modelIds, index + 1, done);
        },
        (errMsg) => {
          // Xử lý lỗi nếu có
          // this.bimViewer._busyModal.hide();
          this.error(errMsg);
          // Trong trường hợp lỗi, vẫn tiếp tục load model tiếp theo
          this._loadModelsSequentially(modelIds, index + 1, done);
        }
      );
    }
  
    _parseProject(models, viewerConfigs) {
      this._buildModelsMenu(models);
      this._parseViewerConfigs(viewerConfigs);
    }
  
    _buildModelsMenu(models) {
      var html = "";
      const modelsInfo = models || [];
      this._modelsInfo = {};
      this._numModels = modelsInfo.length;
      for (let i = 0, len = modelsInfo.length; i < len; i++) {
        const modelInfo = modelsInfo[i];
        this._modelsInfo[modelInfo.id] = modelInfo;
        html += "<div class='xeokit-form-check'>";
        html +=
          "<input id='" +
          modelInfo.id +
          "' type='checkbox' value=''><span id='span-" +
          modelInfo.id +
          "' class='disabled'>" +
          modelInfo.name +
          "</span>";
        html += "</div>";
      }
      this._modelsElement.innerHTML = html;
      for (let i = 0, len = modelsInfo.length; i < len; i++) {
        const modelInfo = modelsInfo[i];
        const modelId = modelInfo.id;
        const checkBox = document.getElementById("" + modelId);
        const span = document.getElementById("span-" + modelId);
        checkBox.addEventListener("click", () => {
          if (checkBox.checked) {
            this.loadModel(modelId);
          } else {
            this.unloadModel(modelInfo.id);
          }
        });
        span.addEventListener("click", () => {
          const model = this.viewer.scene.models[modelId];
          const modelLoaded = !!model;
          if (!modelLoaded) {
            this.loadModel(modelId);
          } else {
            this.unloadModel(modelInfo.id);
          }
        });
        span.oncontextmenu = (e) => {
          this._modelsContextMenu.context = {
            bimViewer: this.bimViewer,
            viewer: this.viewer,
            modelId: modelId,
          };
          this._modelsContextMenu.show(e.pageX, e.pageY);
          e.preventDefault();
        };
      }
    }
  
    _parseViewerConfigs(viewerConfigs) {
      if (viewerConfigs) {
        this.bimViewer.setConfigs(viewerConfigs);
      }
    }
  
    _parseViewerContent(projectInfo, done) {
      const viewerContent = projectInfo.viewerContent;
      if (!viewerContent) {
        done();
        return;
      }
      this._parseModelsLoaded(viewerContent, () => {
        done();
      });
    }
  
    _parseModelsLoaded(viewerContent, done) {
      const modelsLoaded = viewerContent.modelsLoaded;
      if (!modelsLoaded || modelsLoaded.length === 0) {
        done();
        return;
      }
      this._loadNextModel(modelsLoaded.slice(0), done);
    }
  
    _loadNextModel(modelsLoaded, done) {
      if (modelsLoaded.length === 0) {
        done();
        return;
      }
      const modelId = modelsLoaded.pop();
      this.loadModel(
        modelId,
        () => {
          // Done
          this._loadNextModel(modelsLoaded, done);
        },
        () => {
          // Error - recover and attempt to load next model
          this._loadNextModel(modelsLoaded, done);
        }
      );
    }
  
    _parseViewerState(projectInfo, done) {
      const viewerState = projectInfo.viewerState;
      if (!viewerState) {
        done();
        return;
      }
      this.bimViewer.setViewerState(viewerState, done);
    }
  
    unloadProject() {
      const models = this.viewer.scene.models;
      for (var modelId in models) {
        if (models.hasOwnProperty(modelId)) {
          const model = models[modelId];
          model.destroy();
        }
      }
      this._modelsElement.innerHTML = "";
      this._numModelsLoaded = 0;
  
      this._loadModelsButtonElement.classList.add("disabled");
      this._unloadModelsButtonElement.classList.add("disabled");
      if (this._enableAddModels) {
        this._addModelButtonElement.classList.add("disabled");
      }
      const lastProjectId = this._projectId;
      this._projectId = null;
      this.fire("projectUnloaded", {
        projectId: lastProjectId,
      });
    }
  
    getLoadedProjectId() {
      return this._projectId;
    }
  
    getModelIds() {
      return Object.keys(this._modelsInfo);
    }
  
    loadModel(modelId, done, error) {
      const modelView = this._models.find((item) => item.id === modelId);
      this.loadingModel(true);
      this.server.getMetadata(
        modelView.metadataLink,
        (json) => {
          this._loadGeometry(
            modelId,
            modelView.mainLink,
            modelView,
            json,
            done,
            error
          );
        },
        (errMsg) => {
          this.loadingModel(false);
          this.error(errMsg);
          if (error) {
            error(errMsg);
          }
        }
      );
    }
  
    _loadGeometry(modelId, url, modelInfo, json, done, error) {
      const modelLoaded = () => {
        const checkbox = document.getElementById('' + modelId);
        checkbox.checked = true;
        this._numModelsLoaded++;
        this._unloadModelsButtonElement.classList.remove('disabled');
        if (this._numModelsLoaded < this._numModels) {
          this._loadModelsButtonElement.classList.remove('disabled');
        } else {
          this._loadModelsButtonElement.classList.add('disabled')                                                                                                                                                                                                                                                                               ;
        }
        if (this._numModelsLoaded === 1) {
          // Jump camera to view-fit first model loaded
          this._jumpToInitialCamera();
          this.fire('modelLoaded', modelId);
          // this.bimViewer._busyModal.hide();
          this.loadingModel(false);
          if (done) {
            done();
          }
        } else {
          this.fire('modelLoaded', modelId);
          // this.bimViewer._busyModal.hide();
          this.loadingModel(false);
          if (done) {
            done();
          }
        }
      };
  
      const loadError = (errMsg) => {
        // this.bimViewer._busyModal.hide();
        this.loadingModel(false);
        this.error(errMsg);
        if (error) {
          error(errMsg);
        }
      };
  
      if (modelInfo.manifest) {
        // Load multi-part split model;
        // Uses the BIMViewerDataSource, which then uses the BIMViewer's Server strategy
  
        this._dataSource.setProjectId(this._projectId);
        this._dataSource.setModelId(modelId);
  
        const model = this._xktLoader.load({
          id: modelId,
          manifestSrc: modelInfo.manifest,
          excludeUnclassifiedObjects: true,
          origin: modelInfo.origin || modelInfo.position,
          scale: modelInfo.scale,
          rotation: modelInfo.rotation,
          matrix: modelInfo.matrix,
          edges: this._edges,
          saoEnabled: modelInfo.saoEnabled,
          pbrEnabled: modelInfo.pbrEnabled,
          backfaces: modelInfo.backfaces,
          reuseGeometries: modelInfo.reuseGeometries !== false,
          globalizeObjectIds: true,
        });
  
        model.on('loaded', modelLoaded);
        model.on('error', loadError);
      } else {
        // Load single XKT/Metamodel file model;
        // Uses the BIMViewer's Server strategy directly
  
        //themmoi2062
        this.server.getGeometry(
          url,
          (arraybuffer) => {
            try {
              const model = this._xktLoader.load({
                id: modelId,
                metaModelData: json,
                xkt: arraybuffer,
                excludeUnclassifiedObjects: true,
                origin: modelInfo.origin || modelInfo.position,
                scale: modelInfo.scale,
                rotation: modelInfo.rotation,
                matrix: modelInfo.matrix,
                edges: this._edges,
                saoEnabled: modelInfo.saoEnabled,
                pbrEnabled: modelInfo.pbrEnabled,
                backfaces: modelInfo.backfaces,
                globalizeObjectIds: true,
                reuseGeometries: modelInfo.reuseGeometries !== false,
              });
        
              // Check if the model is undefined
              if (!model) {
                console.error('Failed to load model: model is undefined');
                return;
              }
        
              model.on('loaded', modelLoaded);
              model.on('error', loadError);
            } catch (error) {
              return console.error('Error loading model:', error);
            }
          },
          loadError
        );
        //endthemmoi2062
      }
      setTimeout(() => {
          const check = this._areAllModelsChecked();
          this._checkLoadModelsElement.checked = check;
        }, 500);
    }
  
    _areAllModelsChecked() {
      return this._models.every(model => {
          const checkbox = document.getElementById('' + model.id);
          return checkbox && checkbox.checked;
      });
    }
  
    _jumpToInitialCamera() {
      const viewer = this.viewer;
      const scene = viewer.scene;
      const aabb = scene.getAABB(scene.visibleObjectIds);
      const diag = math.getAABB3Diag(aabb);
      const center = math.getAABB3Center(aabb, tempVec3a);
      const camera = scene.camera;
      const fitFOV = camera.perspective.fov;
      const dist = Math.abs(diag / Math.tan(45 * math.DEGTORAD));
      const dir = math.normalizeVec3(
        camera.yUp ? [-0.5, -0.7071, -0.5] : [-1, 1, -1]
      );
      const up = math.normalizeVec3(
        camera.yUp ? [-0.5, 0.7071, -0.5] : [-1, 1, 1]
      );
      viewer.cameraControl.pivotPos = center;
      viewer.cameraControl.planView = false;
      viewer.cameraFlight.jumpTo({
        look: center,
        eye: [
          center[0] - dist * dir[0],
          center[1] - dist * dir[1],
          center[2] - dist * dir[2],
        ],
        up: up,
        orthoScale: diag * 1.1,
      });
    }
  
    unloadModel(modelId) {
      const model = this.viewer.scene.models[modelId];
      if (!model) {
        this.error("Model not loaded: " + modelId);
        return;
      }
      model.destroy();
      const checkbox = document.getElementById("" + modelId);
      checkbox.checked = false;
      const span = document.getElementById("span-" + modelId);
      this._numModelsLoaded--;
      if (this._numModelsLoaded > 0) {
        this._unloadModelsButtonElement.classList.remove("disabled");
      } else {
        this._unloadModelsButtonElement.classList.add("disabled");
      }
      if (this._numModelsLoaded < this._numModels) {
        this._loadModelsButtonElement.classList.remove("disabled");
      } else {
        this._loadModelsButtonElement.classList.add("disabled");
      }
      this._checkLoadModelsElement.checked = false;
      this.fire("modelUnloaded", modelId);
    }
  
    unloadAllModels() {
      const models = this.viewer.scene.models;
      const modelIds = Object.keys(models);
      for (var i = 0, len = modelIds.length; i < len; i++) {
        const modelId = modelIds[i];
        this.unloadModel(modelId);
      }
    }
  
    getNumModelsLoaded() {
      return this._numModelsLoaded;
    }
  
    _getLoadedModelIds() {
      return Object.keys(this.viewer.scene.models);
    }
  
    isModelLoaded(modelId) {
      return !!this.viewer.scene.models[modelId];
    }
  
    getModelsInfo() {
      return this._modelsInfo;
    }
  
    getModelInfo(modelId) {
      return this._modelsInfo[modelId];
    }
  
    setEnabled(enabled) {
      if (!enabled) {
        this._modelsTabButtonElement.classList.add("disabled");
        this._unloadModelsButtonElement.classList.add("disabled");
      } else {
        this._modelsTabButtonElement.classList.remove("disabled");
        this._unloadModelsButtonElement.classList.remove("disabled");
      }
    }
  
    loadingModel(isLoading) {
      const loadingIfc = document.getElementById("loadingIfc");
      if (loadingIfc) {
        isLoading
          ? (loadingIfc.style.zIndex = "2")
          : (loadingIfc.style.zIndex = "0");
      }
    }
  
    /** @private */
    destroy() {
      super.destroy();
      this._xktLoader.destroy();
    }
  }
  
  export { ModelsExplorer };
  