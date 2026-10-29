# ViewRTSP

## Definition

공장 작업자가 CCTV의 RTSP 라이브 화면을 웹에서 보다가, 필요하다고 판단한 바로 그 순간의 화면을 캡처하거나 영상으로 저장하게 해 주는 앱이다.

## Users and situations

- 공장에서 CCTV 화면을 확인하는 작업자.
- 기존 C# Windows 앱을 쓰던 사용자이며, 라즈베리파이 같은 Linux 기기에서도 같은 일을 해야 한다.
- 현재 연결 대상은 카메라 1대다.

## Problem and current alternatives

기존 Windows 앱은 Linux 기기에서 실행되지 않는다. 지금은 스트림을 받는 임시 Python 프로그램이 매 프레임을 이미지로 웹에 전달한다. 이 방식은 화면 지연이 심해서, 작업자가 저장하려고 판단한 시점보다 이전의 이미지가 저장된다.

## Promised change

작업자는 Linux 기기에서도 웹만으로 라이브 화면을 보고, 자신이 판단한 순간의 이미지와 영상을 저장할 수 있다.

## Core loop

작업자가 라이브 화면을 본다. 저장할 상황이라고 스스로 판단한다. 버튼을 눌러 화면을 캡처하거나 영상을 저장한다.

## Capabilities and boundaries

- RTSP 라이브 화면을 웹 브라우저에서 보여 준다.
- 작업자가 버튼으로 현재 화면을 캡처하거나 영상으로 저장한다.
- 저장 여부는 작업자가 판단한다. 앱이 상황을 자동으로 판단하지 않는다.
- 저장한 이미지와 영상을 어디에 어떻게 쓰는지는 이 프로젝트의 범위 밖이다.

## Experience principles

- 저장되는 이미지와 영상은 작업자가 보고 판단한 순간과 어긋나지 않아야 한다.

## Success signals

None identified.

## Assumptions and unknowns

- Unknown: 화면을 동시에 몇 개까지 보여 줄지 (현재는 카메라 1대).
- Unknown: "정확한 시점"으로 인정할 허용 오차.
- Unknown: 성공 신호, 즉 약속한 변화가 일어나고 있음을 보여 주는 관찰 가능한 증거.
