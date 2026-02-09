// Vis.js ER Diagram for Hospital Blood Inventory Management System
// This code creates an entity-relationship diagram showing the structure of the blood bank database

// Define nodes (entities)
var nodes = new vis.DataSet([
  {
    id: 1,
    label: 'Hospital\n\nhospital_id (PK)\nhospital_name\naddress\ncity\nstate\nzip_code\nphone\nemail\ncapacity',
    color: '#FF6B6B',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 2,
    label: 'Inventory\n\ninventory_id (PK)\nhospital_id (FK)\nblood_type_id (FK)\ncomponent_id (FK)\nquantity_units\nexpiry_date\ndate_added\nstatus',
    color: '#4ECDC4',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 3,
    label: 'Donation\n\ndonation_id (PK)\nhospital_id (FK)\nblood_type_id (FK)\ndonor_name\ndonor_contact\ndonation_date\nquantity_units\ntest_status\ntest_result',
    color: '#95E1D3',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 4,
    label: 'Request\n\nrequest_id (PK)\nhospital_id (FK)\nblood_type_id (FK)\ncomponent_id (FK)\nrequested_by\nrequested_date\nrequired_by_date\nquantity_units\nstatus\npriority',
    color: '#F7DC6F',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 5,
    label: 'Transfer\n\ntransfer_id (PK)\nfrom_hospital_id (FK)\nto_hospital_id (FK)\nblood_type_id (FK)\ncomponent_id (FK)\nquantity_units\ntransfer_date\nstatus\nreceived_date',
    color: '#BB8FCE',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 6,
    label: 'Blood Type\n\nblood_type_id (PK)\nblood_group\nrh_factor\ndescription',
    color: '#85C1E2',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  },
  {
    id: 7,
    label: 'Component\n\ncomponent_id (PK)\ncomponent_name\nshelf_life_days\ndescription\nunit_type',
    color: '#F8B88B',
    shape: 'box',
    font: { size: 13, face: 'Arial', align: 'center' }
  }
]);

// Define edges (relationships)
var edges = new vis.DataSet([
  // Hospital to Inventory (1 to Many)
  {
    from: 1,
    to: 2,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Hospital to Donation (1 to Many)
  {
    from: 1,
    to: 3,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Hospital to Request (1 to Many)
  {
    from: 1,
    to: 4,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Hospital to Transfer (1 to Many) - from hospital
  {
    from: 1,
    to: 5,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCCW' }
  },
  // Blood Type to Inventory (1 to Many)
  {
    from: 6,
    to: 2,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Blood Type to Donation (1 to Many)
  {
    from: 6,
    to: 3,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCCW' }
  },
  // Blood Type to Request (1 to Many)
  {
    from: 6,
    to: 4,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Blood Type to Transfer (1 to Many)
  {
    from: 6,
    to: 5,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCCW' }
  },
  // Component to Inventory (1 to Many)
  {
    from: 7,
    to: 2,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  },
  // Component to Request (1 to Many)
  {
    from: 7,
    to: 4,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCCW' }
  },
  // Component to Transfer (1 to Many)
  {
    from: 7,
    to: 5,
    label: '1:M',
    color: { color: '#333333' },
    font: { size: 12, align: 'middle' },
    smooth: { type: 'curvedCW' }
  }
]);

// Network options
var options = {
  physics: {
    enabled: true,
    stabilization: {
      iterations: 200
    },
    barnesHut: {
      gravitationalConstant: -30000,
      centralGravity: 0.3,
      springLength: 300,
      springConstant: 0.04
    }
  },
  nodes: {
    widthConstraint: {
      maximum: 200
    }
  },
  edges: {
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.5
      }
    },
    smooth: {
      enabled: true,
      type: 'continuous'
    }
  },
  interaction: {
    navigationButtons: true,
    keyboard: true,
    zoomView: true
  }
};

// Initialize network
var container = document.getElementById('network');
var data = {
  nodes: nodes,
  edges: edges
};

var network = new vis.Network(container, data, options);
