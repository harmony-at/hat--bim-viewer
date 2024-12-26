import {Controller} from "../Controller.js";
import {IssuesPlugin, IssuesMouseControl} from "@xeokit/xeokit-sdk";

export class IssuesTool extends Controller {
    constructor(parent, cfg) {
      super(parent);
      this._issuesPlugin = new IssuesPlugin(this.viewer, {
        defaultAxisVisible: false,
        defaultLabelsOnWires: false,
        bimview: parent,
      });
  
      this._issuesPlugin.on('mouseOver', (e) => {
        e.issue.setHighlighted(true);
      });
  
      this._issuesPlugin.on('mouseLeave', (e) => {
        e.issue.setHighlighted(false);
      });
  
      this._issuesMouseControl = new IssuesMouseControl(this._issuesPlugin, {
        //   pointerLens : new PointerLens(viewer)
      });
  
      this._issuesMouseControl.snapping = true;
  
      this.bimViewer.on('reset', () => {
        this.setActive(false);
        this.clear();
      });
    }
  
    //themmoi2612
    setActiveIssue(done, isPoint) {
      this._issuesMouseControl.activate(done, isPoint);
    }
  
    setDeactiveIssue() {
      this._issuesMouseControl.deactivate();
    }
  
    //themmoi37
    loadIssue(data) {
      this._issuesMouseControl.loadIssue(data);
    }
    deleteIssue(id) {
      this._issuesMouseControl.deleteIssue(id);
    }
    clearIssue() {
      this._issuesMouseControl.clearIssue();
    }
    //endthemmoi37
  
    clear() {
      this._issuesPlugin.clear();
    }
  }