var express = require('express');
var app = express();

var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var bodyParser = require('body-parser');
var Promise = require('promise');
app.use(bodyParser.urlencoded({ extended: true })); 

var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
var auth = new googleAuth();
var jwtClient = new auth.JWT(
  process.env.GOOG_CLIENT_EMAIL,
  null,
  process.env.GOOG_PRIV_KEY,
  SCOPES,
  'GDriveSearch@ashevillenc.gov'
);

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//when user first comes to page, display the default search page
app.get('/', function(request, response) {
  response.render('pages/index', {
    searchTerm: '',
    matchingResults: [],
    searchTermEntered: false,
    errorFound: false
  });
});

//when user presses search button, search the folder for the search string provided
//then render the search page with the results
app.post('/', function(request, response) {
  var folderId = request.query.folderId || '0B9Pgxc7gYp1IZHNReU0yXzR3Nm8';
  var searchString = request.body.searchInput.replace(/'/g, "\\'"); 
  jwtClient.authorize(function (err, tokens) {
    if (err) {
      console.log(err);
      return;
    }
    filesContainingString(jwtClient, folderId, searchString).then(function(result){
      response.render('pages/index', {
        searchTerm: request.body.searchInput,
        matchingResults: result,
        searchTermEntered: true,
        errorFound: false
      });
    }).catch(function(result) {
        response.render('pages/index', {
          searchTerm: request.body.searchInput,
          matchingResults: result,
          searchTermEntered: true,
          errorFound: true
        });
    });
  })
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

/**
 * Lists the names of the files found matching searchString, immediately inside the folderId provided
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {folderID} a Google Drive folder id
 * @param {searchString} a string to search for
 */
function filesContainingString(auth, folderId = '', searchString='Bojangles') {
  return new Promise(function (resolve, reject) {
    var service = google.drive('v3');
      service.files.list({
        auth: auth,
        q: "'" + folderId + "' in parents and mimeType != 'application/vnd.google-apps.folder' and (name contains '" + searchString + "' or fullText contains '" + searchString + "')",
        fields: "nextPageToken, files(id, name, mimeType, webContentLink)"
      }, function(err, response) {
        if (err) {
          console.log(err);
          return reject('The API returned an error: ' + err);
        } else {
          return resolve(response.files);
        }
      });
  })
}