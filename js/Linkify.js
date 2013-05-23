$('#wrapper').masonry({});

var apitoKey = '8e2d1aa86af80b4cea8b721db4f178f2aab308d6';
var popover = null;
var popoverOn = false;
var expanded = false;
var selected = null;
var origW;
var isMouseDown = false;
var didBeginDragging = false;
var afterFirstClick = false;
var inBody = false;
var timeout = null;
var sidebarFaded = true;
var popoverAction = "off";
var previousHeight = -1;
var didLastIntersect = false;
var hoveringBlock = null;
var state = "main"
var savedWrapperText = "";
var selectedBundle = null;
var jsonSave = { };
var bundleCookie = "bundle";
var bundleNames = { };
var bundleNameCount = 0;
var focused = true;

function getAppropriateStorage() {
	return localStorage; 
}

function setValue(key, value) {
	var storage = getAppropriateStorage();
	
	storage.setItem(key,value);
}

function getValue(key) {
	var storage = getAppropriateStorage();

	return storage.getItem(key);
}

function clearErrors() {
	var error = document.getElementById("error");
	$(error.firstChild).fadeOut();
}

function createError(msg) {	
	document.getElementById("error").innerHTML = "";
	var errorMsg = document.createElement("span");
	errorMsg.setAttribute("class", "alert alert-error");
	errorMsg.innerHTML = msg;
	
	document.getElementById("error").appendChild(errorMsg);
	setTimeout(clearErrors, 3000);
}

$('#search').bind('keypress', function(e) {
	if(e.keyCode == 13){
		var text = this.value;
		search(text);
    }
});

function contentFromLink(text) {
	if (!text) {
		text = document.getElementById("search").value;
	}
		
	if (!text) return;
		
	if (text.indexOf("http://") < 0) {
		text = "http://" + text;
	}

	var content = {'name':"", 'type':"small", 'src':""};
	content['src'] = text;
	
	if (text.length < 20) {
		content['name'] = text;
	}
	else {
		content['name'] = text.substr(0, 20) + "...";
	}
	return content;
}

function search(text) {
 	var toWrite = document.getElementById("wrapper");
	var content = contentFromLink(text);
	
	var newLink = generatePoloroid(content, toWrite);	
	if (state == "bundle") {
		addLinkToBlock(newLink, selectedBundle);
	}
	document.getElementById("search").value = "";
}

function select(obj) {
	obj.style.opacity = .5;
}

function deselect(obj) {
	obj.style.opacity = 1;
	obj = null;
	selected = null;
	afterFirstClick = false;
}

function clicked(delegate, event) {
	isMouseDown = true;
	stop(event)
	if (selected != null) {
		if (selected == delegate) {
			return;
		}
		else {
			deselect(selected);
		}
	}
	selected = delegate;
	select(selected);
}

function openup(delegate, event) {
	window.open(delegate.getAttribute("href"));	
}

function deleteLink(delegate, event) {
	event.preventDefault();
	event.stopPropagation();
	
	var obj = (delegate.parentNode.parentNode);
	destroy(obj);
}

function deleteLinkFromBundle(link, bundle) {
	if (link == null || bundle == null) return;
	link = link.getAttribute("href");
	var children = bundle.childNodes;
	
	for (i = 0; i < children.length; i++) {
		if (children[i].getAttribute("href") == link) {
			$(children[i]).remove();
			break;
		}
	}
	saveBlock(bundle);
}

function destroy(obj) {
	if (obj) {
		$(obj).fadeOut(100, function() {
			$(obj).remove();
			$("#wrapper").masonry("reload");
			afterFirstClick = false
		});
		
		if (state == "bundle") {
			deleteLinkFromBundle(obj, selectedBundle);	
		}
	}
}

function destroyBundle(obj) {
	if (focused) return;
	var name = obj.parentNode.firstChild.innerHTML;
	selectBundle(obj);
	obj.parentNode.innerHTML = "";
	jsonSave[name] = "";
	var tosave = JSON.stringify(jsonSave);
	setValue(bundleCookie, tosave);
	for (i = 0; i < bundleNameCount; i++) {
		if (bundleNames[i] == name)
			bundleNames[i] = "";
	}
}

function stop(event, obj) {
	event.stopPropagation();
	event.preventDefault();
}

function intersect(obj1, obj2) {
	var w1, h1, l1, t1;
	var w2, h2, l2, t2;
	
	w1 = $(obj1.firstChild).innerWidth();
	h1 = $(obj1.firstChild).innerHeight();
	l1 = $(obj1).offset().left;
	t1 = $(obj1).offset().top;
	
	w2 = $(obj2).innerWidth();
	h2 = $(obj2).innerHeight();
	l2 = $(obj2).offset().left;
	t2 = $(obj2).offset().top;
		
	if ((l1 > l2 && l1 < (l2 + w2)) ||
		((l1 + w1) < (l2 + w2) && (l1 + w1) > l2))
		if ((t1 > t2 && t1 < (t2 + h2)) ||
			((t1 + h1) < (t2 + h2) && (t1 + h1) > t2)) 
			return true;
	return false;
}

function containsPoint(obj, x, y) {
	var w, h, l, t;
	w = $(obj).innerWidth();
	h = $(obj).innerHeight();
	l = $(obj).offset().left;
	t = $(obj).offset().top;
		
	if (x >= l && x <= (w + l)) {
		if (y >= t && y <= (t + h))
			return true;
	}
	return false;
}
	
function dragging(obj, event) {
	stop(event);
	
	if (isMouseDown && selected == obj) {
		didBeginDragging = true;
	
		if (!inBody) {
			$("#wrapper").masonry("remove", $(obj));
			$('body').append(obj);
			inBody = true;
		}
		
		obj.style.position = "absolute";
		obj.style.left = event.pageX - 100 + "px";
		obj.style.top = event.pageY - 50 + "px";
		obj.style.zIndex = "200";		
		obj.firstChild.style.left = "0px";
		obj.firstChild.style.top = "0px";
		
		var recipients = document.getElementsByClassName("bundle");	

		for (i = 0; i < recipients.length; i++) {
			if (containsPoint(recipients[i], event.pageX, event.pageY)) {
				highlightRecipient(recipients[i]);
				break;
			}
			else {
				dehighlightRecipient(recipients[i]);
			}
		}
	}
}

function saveBlock(block) {
	var name = block.parentNode.firstChild.innerHTML;
	var content = block.parentNode;
	var wrap = document.createElement("div");
	wrap.appendChild(content.cloneNode(true));

	jsonSave[name] = ""+wrap.innerHTML+"";
	var tosave = JSON.stringify(jsonSave);
	setValue(bundleCookie, tosave);
}

function addLinkToBlock(link, block) {
	if (link == null || block == null) return;
	var linkref = link.getAttribute("href");
	var imgSz = "60x50";
	var imgSrc = "http://api.snapito.com/web/" + apitoKey + "/" + imgSz + "?url=" + linkref;
	var imgTag = document.createElement("img");
	imgTag.setAttribute("href", linkref);
    imgTag.setAttribute("height", "50px");
    imgTag.setAttribute("width", "60px");    
    imgTag.style.backgroundColor = "white";
    imgTag.setAttribute("src", imgSrc);
	
	var img = $("<img/>").attr('src', imgSrc)
						 .load(function() {
						 	imgTag.setAttribute("src", imgSrc);
						 })
						 .error(function() {
							$(imgTag).remove();
							saveBlock(block);
                      	 });						 

	block.appendChild(imgTag);
	saveBlock(block);
}

function release(obj, event) {
	stop(event);
	
	if (didBeginDragging) {
		if (selected == obj) {
			deselect(obj);
			
			$(obj).remove();
			obj.style.position = "";
			obj.firstChild.style.left = "0px";
			obj.firstChild.style.top = "0px";
			obj.style.zIndex = "100";
			
			if (hoveringBlock != null) {
				addLinkToBlock(obj, hoveringBlock);
			}
			else {
				$("#wrapper").prepend($(obj)).masonry("reload");
			}
		}
	}
	else {
		if (afterFirstClick) {
			deselect(obj);
		}
		else {
			afterFirstClick = true;		
		}
	}
	
	didBeginDragging = false;
	isMouseDown = false;
	inBody = false;
	fadeOutSidebar();
}

$(".poloroid-small").live({
	mouseenter: function() {
		$(this).fadeTo("fast", .65);
	},
	mouseout: function() {
		$(this).fadeTo("fast", 1);
	}
});	

function generatePoloroid(content, toWrite) {
	var link = document.createElement("a");
	link.setAttribute("onmousedown", "clicked(this, event);");	
	link.setAttribute("onclick", "stop(event);");
	link.setAttribute("ondblclick", "openup(this, event);");
	link.setAttribute("onmousemove", "dragging(this, event)");
	link.setAttribute("onmouseup", "release(this, event)");
	link.setAttribute("href", content['src']);
	link.setAttribute("target", "blank");
	
	toWrite.appendChild(link);
		
	var poloroid = document.createElement("div");
	var image = document.createElement("div");
	var imageSz;
		
	poloroid.setAttribute("class", "poloroid-small");
 	poloroid.setAttribute("title", content['src']);
	
	image.setAttribute("class", "image-small");
	imageSz = "160x100";
	
	var imgTag = document.createElement("img");
	var imageSrc = "http://api.snapito.com/web/" + apitoKey + "/" + imageSz + "?url=" + content['src'];
	
	link.appendChild(poloroid);
	poloroid.appendChild(image);
	
    imgTag.setAttribute("src", "img/load.gif");
    image.appendChild(imgTag);	
		
	var del = document.createElement("img");
	del.setAttribute("src", "img/close.png");
	del.setAttribute("onclick", "deleteLink(this, event)");
	del.style.float = "right";
	poloroid.appendChild(del);		
		
	var caption = document.createElement("div");
	caption.setAttribute("class", "captions");
	caption.innerHTML = content['name'];	
	poloroid.appendChild(caption);

	$(poloroid).hide().fadeIn();
	$("#wrapper").imagesLoaded(function() {
		$('#wrapper').prepend($(link)).masonry('reload');
	})
	
	var img = $("<img/>").attr('src', imageSrc)
         	             .load(function() {         	             
                    	         imgTag.setAttribute("src", imageSrc);
							 	 imgTag.setAttribute("alt", "none");
							 	 link.setAttribute("onmousemove", "dragging(this, event)");
						  		 link.setAttribute("onmouseup", "release(this, event)");
 								
								 $("#wrapper").masonry("reload");
                      	})
                      	.error(function() {
                      		document.getElementById("wrapper").removeChild(link);
	   					    $("#wrapper").masonry("reload");
	   					    createError("Unabel to load site: <a target=\"blank\" href=\"" + 
	   					    			content['src'] + "\">" + content['name'] + "</a>");
                      	});
    return link;
}

function loadBundles() {
	var sidebar = document.getElementById("sidebarWrapper");
	for (bundle in jsonSave) {
		sidebar.innerHTML += jsonSave[bundle];
	}
	var inserted = document.getElementsByClassName("bundle");
	for (i = 0; i < inserted.length; i++) {
		borderifyBundle(inserted[i]);
		bundleNames[bundleNameCount++] = inserted[i].parentNode.firstChild.innerHTML;
	}
}

window.onload = function() {
	$("#logo").fitText();
		$("#wrapper").imagesLoaded(function() {
			$('#wrapper').masonry({
					itemSelector:'.poloroid-small',
					columnWidth:100,
					isAnimated: true,
				  	animationOptions: {
				    duration: 100,
    				easing: 'linear',
    				queue: false
  				}
			});
		});
	$(document.getElementById("search")).focus();
	var bundles = getValue(bundleCookie);
	jsonSave = $.parseJSON(bundles);
	if (jsonSave == null)
		jsonSave = new Object();
	loadBundles();
}


function createButton(name, callback) {
	var button = document.createElement("button");
	button.innerHTML = name;
	button.setAttribute("onclick", callback);
	button.setAttribute("class", "btn");	
	button.style.width = "100px";
	button.style.marginLeft = "150px";
	return button;
}

function createPasswordInput(name) {
	var cushion = document.createElement("p");
	cushion.setAttribute("class", "inputCushion");
	
	var label = document.createElement("span");
	var input = document.createElement("input");
	
	label.setAttribute("class", "alignLabel");
	input.setAttribute("class", "alignInput");
	input.setAttribute("size", "28");	
	input.style.height = "25px";
	
	label.innerHTML = name;
	input.setAttribute("type", "password");
	
	cushion.appendChild(input);
	cushion.appendChild(label);
	cushion.innerHTML += "<br/>";
	
	return cushion;
}

function createFormWell() {
	var well = document.createElement("div");
	well.setAttribute("class", "well form-search");
	well.style.textAlign = "center";
	return well;
}

function createInput(name, id) {
	var cushion = document.createElement("p");
	cushion.setAttribute("class", "inputCushion");
	
	var label = document.createElement("span");
	var input = document.createElement("input");
	
	label.setAttribute("class", "alignLabel");
	input.setAttribute("id", id);
	input.setAttribute("class", "alignInput");
	input.setAttribute("size", "28");	
	input.setAttribute("autofocus", "autofocus");
	input.style.height = "25px";
	
	label.innerHTML = name;
	input.setAttribute("type", "text");
	
	cushion.appendChild(input);
	cushion.appendChild(label);
	cushion.innerHTML += "<br/>";
	
	return cushion;
}

function createPopover() {
	popover = document.createElement("div");
	popover.setAttribute("class", "popover");
	popoverOn = true;
	
	var close = document.createElement("a");
	var image = document.createElement("img");
	
	close.setAttribute("onclick", "removePopover()");
	close.setAttribute("href", "#");
	image.setAttribute("src", "img/close.png");
	image.setAttribute("alt", "");
	image.setAttribute("width", "20px");
	image.setAttribute("height", "20px");	
	close.style.float = "right";
	close.style.marginLeft = "400px";
	close.style.display = "inline";
	
	close.appendChild(image);
	popover.appendChild(close);
}

function showPopover() {
	$(".popover").hide().fadeIn();
	
	$(".popover").click(function(event) {
		event.stopPropagation();
	});
	$("#surround").animate({
		opacity: .3
	});
}

function removePopover() {
	if (popover != null) {
		$(".popover").fadeOut(300, function() {
			$(this).remove();
			popoverOn = false;
		});
		$("#surround").animate({
			opacity: 1
		});
		popover = null;		
	}
}

function fadeOutSidebar() {
	if (sidebarFaded) return;
	sidebarFaded = true;
	var obj = document.getElementById("sidebar");
	if (obj.style.opacity == 1)
		$(obj).fadeTo("fast", .8);
}

function fadeInSidebar() {
	if (!sidebarFaded) return;
	sidebarFaded = false;
	var obj = document.getElementById("sidebar");
	if (obj.style.opacity != 1)
		$(obj).fadeTo("fast", 1);
}

function borderifyBundle(bundle) {
	if (bundle == null) return;
	if (selectedBundle == bundle) {
		bundle.parentNode.style.backgroundColor = "#CCCCCC";
	}
	else {
		bundle.parentNode.style.backgroundColor = "rgba(0,0,0,0)";
	}
}

function selectBundle(bundle) {
	
	var toWrite = document.getElementById("wrapper");
	var lastSelectedBundle = selectedBundle;
	if (state == "main") {
		state = "bundle";
		savedWrapperText = toWrite.innerHTML;
		toWrite.innerHTML = "";
		var children = bundle.childNodes;
		
		for (i = 0; i < children.length; i++) {
			var link = children[i].getAttribute("href");
			var content = contentFromLink(link);
			generatePoloroid(content, toWrite);
		}
		selectedBundle = bundle;
	}
	else if (state == "bundle") {
		if (selectedBundle == bundle) {
			toWrite.innerHTML = "";
			toWrite.innerHTML = savedWrapperText;	
			state = "main";
			$("#wrapper").masonry("reload");
			selectedBundle = null;
		}
		else {
			toWrite.innerHTML = "";
			
			var children = bundle.childNodes;
		
			for (i = 0; i < children.length; i++) {
				var link = children[i].getAttribute("href");
				var content = contentFromLink(link);
				generatePoloroid(content, toWrite);
			}
			
			selectedBundle = bundle;
			state = "bundle";
		}
	}
	borderifyBundle(bundle);
	borderifyBundle(lastSelectedBundle);
	
	if (state == "bundle") {
		document.getElementById("wrapper").style.backgroundColor = "#CCCCCC";
	}
	else {
		document.getElementById("wrapper").style.backgroundColor = "rgba(0,0,0,0)";
	}
}

function createBundle() {
	var name = document.getElementById("recipientName").value;
	var sidebarWrapper = document.getElementById("sidebarWrapper");

	for (i = 0; i < bundleNameCount; i++) {
		if (bundleNames[i] == name) {
			createError("That bundle already exists");
			return;
		}
	}

	bundleNames[bundleNameCount++] = name;

	var newBundle = document.createElement("div");
	newBundle.style.padding = "10px";
	newBundle.style.width = "121px";
	newBundle.style.marginLeft = "5px";
	newBundle.style.border = "1px solid rgba(0,0,0,0)";
	newBundle.style.textAlign = "center";
	newBundle.style.borderRadius = "3px";
	
	var nameTag = document.createElement("div");
	nameTag.setAttribute("class", "nameLabel");
	nameTag.style.color = "#555555";
	nameTag.innerHTML = name;
	newBundle.appendChild(nameTag);
	
	var bundle = document.createElement("div");
	bundle.setAttribute("class", "bundle");
	bundle.setAttribute("onclick", "selectBundle(this)");
	bundle.style.opacity = ".7";
	newBundle.appendChild(bundle);
	
	var send = document.createElement("input");
	send.setAttribute("type", "button");
	send.setAttribute("class", "btn");
	send.style.margin = "0px";
	send.style.borderRadius = "0px";
	send.style.float = "left";
	send.style.padding = "5px";
	send.style.width = "122px";
	send.setAttribute("value", "Send");
	newBundle.appendChild(send);
	
	var clear = document.createElement("div");
	clear.style.clear = "both";
	newBundle.appendChild(clear);
	
	sidebarWrapper.appendChild(newBundle);
	$(newBundle).hide().fadeIn("fast");
	$(sidebarWrapper).animate({scrollTop : $(sidebar).height()}, "fast");
}

function newBundle(event) {
	if (popover != null) {
		removePopover();
		return;
	}
	stop(event);
	createPopover();
	var title = document.createElement("div");
	title.innerHTML = "+ Bundle";
	popover.appendChild(title);
	popover.innerHTML += "<br/>";
	var well = createFormWell();
	var input = createInput("Name", "recipientName");	
	well.appendChild(input);
	well.innerHTML += "<br/>";
	well.innerHTML += "<span style='font-size:10pt;text-align:center'>Hit enter to create bundle</span>";
	popover.appendChild(well);
	document.body.appendChild(popover);
	showPopover();	
}

function dehighlightRecipient(rec) {
	rec.style.opacity = .5;
	hoveringBlock = null;
	$(rec).css({
		'box-shadow' : '0px 0px 10px #737373',
		'-webkit-box-shadow' : '0px 0px 10px #737373',
		'-moz-box-shadow' : '0px 0px 10px #737373'
	});
}

function highlightRecipient(rec) {
	rec.style.opacity = 1;
	rec.style.backgroundColor = "black";
	rec.style.zIndex = 1000;
	hoveringBlock = rec;
	$(rec).css({
		'box-shadow' : '0px 0px 20px #737373',
		'-webkit-box-shadow' : '0px 0px 20px #737373',
		'-moz-box-shadow' : '0px 0px 20px #737373'
	});
}
	
$(".bundle").live({
	mouseenter: function() {
		highlightRecipient(this);
	},
	mouseleave: function() {
		dehighlightRecipient(this);
	}
});

$("body").on("click", "a", function(event) {
	if (popoverOn) {
		event.preventDefault();
		return;
	}
});

window.onmousemove = function(event) {
	if (didBeginDragging) {
		dragging(selected, event);
	}
}

window.onclick = function() {
	if (selected != null) {
		deselect(selected);
		selected = null;
	}
}

$("body").click(function(event) {
	removePopover();
	if (selected != null) {
		deselect(selected);
		selected = null;
	}
});

$(document).keyup(function(e) {
  if (e.keyCode == 27 || e.keyCode == 13) {
  	if (popoverOn)
  		removePopover();
  }
  if (e.keyCode == 13) {
  	if (popoverOn) {
		createBundle();
		removePopover();
  	}
  }
});

window.onkeydown = function(e) {
	if (e.keyCode == 8) {
		if (selected != null) {
			destroy(selected);
			selected = null;
			return false;
		}
		if (selectedBundle != null && !focused && !popoverOn) {
			destroyBundle(selectedBundle);
			return false;
		}
		return true;
	}
}

$("#search").focus(function() {
	focused = true;
});

$("#search").focusout(function() {
	focused = false;
});